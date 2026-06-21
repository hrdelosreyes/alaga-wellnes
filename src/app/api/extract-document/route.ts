import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const PROMPTS = {
  nbi: `This is a Philippine NBI (National Bureau of Investigation) clearance document.
Extract the following fields and return ONLY a JSON object, no other text:
{
  "controlNumber": "the NBI control/reference number printed on the document",
  "fullName": "the full name of the clearance holder",
  "dateIssued": "date the clearance was issued (YYYY-MM-DD or as printed)",
  "expiryDate": "expiry or valid until date (YYYY-MM-DD or as printed)"
}
If a field is not visible or legible, use null.`,

  tesda: `This is a Philippine TESDA (Technical Education and Skills Development Authority) certificate or National Certificate (NC).
Extract the following fields and return ONLY a JSON object, no other text:
{
  "certificateNumber": "the certificate or registry number printed on the document",
  "fullName": "the full name of the certificate holder",
  "qualification": "the NC title or qualification name (e.g. Massage Therapy NC II)",
  "dateIssued": "date the certificate was issued (YYYY-MM-DD or as printed)"
}
If a field is not visible or legible, use null.`,
}

export async function POST(req: NextRequest) {
  try {
    const { therapistId, storagePath, documentType } = await req.json()

    if (!therapistId || !storagePath || !documentType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (documentType !== 'nbi' && documentType !== 'tesda') {
      return NextResponse.json({ error: 'Invalid document type' }, { status: 400 })
    }

    const supabase = await createServiceClient()

    // Generate a signed URL so Claude can read the image
    const { data: signedData, error: signedError } = await supabase.storage
      .from('therapist-docs')
      .createSignedUrl(storagePath, 120) // 2-minute window for Claude to fetch

    if (signedError || !signedData?.signedUrl) {
      return NextResponse.json({ error: 'Could not access document' }, { status: 500 })
    }

    // Determine media type from extension
    const ext = storagePath.split('.').pop()?.toLowerCase()
    const mediaType = ext === 'pdf'
      ? 'application/pdf' as const
      : ext === 'png'
      ? 'image/png' as const
      : 'image/jpeg' as const

    // Call Claude vision
    const message = await anthropic.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: [
          {
            type:   'image',
            source: { type: 'url', url: signedData.signedUrl },
          },
          {
            type: 'text',
            text: PROMPTS[documentType as keyof typeof PROMPTS],
          },
        ],
      }],
    })

    // Parse Claude's JSON response
    const raw = message.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('')
      .trim()

    let extracted: Record<string, string | null>
    try {
      // Strip markdown code fences if present
      const json = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
      extracted = JSON.parse(json)
    } catch {
      return NextResponse.json({ error: 'Could not parse document — image may be unclear' }, { status: 422 })
    }

    // Save to therapist row
    const column = documentType === 'nbi' ? 'nbi_extracted' : 'tesda_extracted'
    await supabase
      .from('therapists')
      .update({ [column]: extracted })
      .eq('id', therapistId)

    return NextResponse.json({ extracted })
  } catch (err) {
    console.error('extract-document error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
