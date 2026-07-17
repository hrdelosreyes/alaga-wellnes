import Link from 'next/link'
import Image from 'next/image'
import logoVerticalDark from '../../../public/logo-vertical-dark.png'

export function Footer() {
  return (
    <footer className="bg-[#2C2420] text-[#C4A899] mt-24">
      <div className="container-alaga py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <div className="mb-3">
              <Image src={logoVerticalDark} alt="Alaga Wellness" style={{ height: '80px', width: 'auto' }} />
            </div>
            <p className="text-sm leading-relaxed">
              Verified wellness professionals delivered safely to your home.
            </p>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Services</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/#services" className="hover:text-white transition-colors">Alaga Relax</Link></li>
              <li><Link href="/#services" className="hover:text-white transition-colors">Alaga Hilot</Link></li>
              <li><Link href="/#services" className="hover:text-white transition-colors">Alaga Recovery</Link></li>
            </ul>
          </div>

          {/* Partners */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Partners</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/therapist/register" className="hover:text-white transition-colors">Become a Therapist</Link></li>
              <li><Link href="/therapist/login" className="hover:text-white transition-colors">Therapist Portal</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Support</h4>
            <ul className="space-y-2 text-sm">
              <li>📧 <a href="mailto:hello@alagawellness.care" className="hover:text-white transition-colors">hello@alagawellness.care</a></li>
              <li className="pt-1 text-xs text-[#C8BDB8]">Available 8AM – 10PM daily</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[#3D3330] mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-[#C8BDB8]">
          <span>© {new Date().getFullYear()} Alaga Wellness. All rights reserved.</span>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
