# Splits seed_barangays.sql into ~10 files runnable in the Supabase SQL editor.
# Run from the supabase/ folder:  .\split_barangays.ps1

$source = "$PSScriptRoot\seed_barangays.sql"
$content = Get-Content $source -Raw

# Extract the DDL block (everything before the first INSERT)
$ddlEnd   = $content.IndexOf("`ninsert into barangays")
$ddl      = $content.Substring(0, $ddlEnd).Trim()

# Extract all INSERT blocks (each ends with a semicolon on its own line)
$inserts  = [regex]::Matches($content, '(?s)insert into barangays[^;]+;')

$chunkSize  = 5          # INSERT statements per file (~2 500 rows each)
$fileIndex  = 1
$total      = $inserts.Count

Write-Host "Total INSERT blocks: $total  →  splitting into chunks of $chunkSize"

# First file: DDL + first chunk of inserts
$chunks = [System.Collections.Generic.List[string]]::new()
$buf    = [System.Collections.Generic.List[string]]::new()

for ($i = 0; $i -lt $total; $i++) {
    $buf.Add($inserts[$i].Value)
    if ($buf.Count -eq $chunkSize -or $i -eq $total - 1) {
        $chunks.Add($buf -join "`n`n")
        $buf.Clear()
    }
}

# Write chunk 1 with DDL, rest without
for ($i = 0; $i -lt $chunks.Count; $i++) {
    $num      = ($i + 1).ToString().PadLeft(2, '0')
    $outPath  = "$PSScriptRoot\seed_barangays_part$num.sql"
    if ($i -eq 0) {
        "$ddl`n`n$($chunks[$i])" | Out-File $outPath -Encoding utf8
    } else {
        $chunks[$i] | Out-File $outPath -Encoding utf8
    }
    Write-Host "Wrote $outPath"
}

Write-Host "`nDone. Run seed_barangays_part01.sql first (it has the table DDL), then the rest in order."
