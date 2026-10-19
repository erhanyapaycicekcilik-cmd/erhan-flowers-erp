import { NextRequest, NextResponse } from 'next/server'
import { initiate3DS, tamiEnabled } from '@/lib/tami'
import { store3dsHtml } from '@/lib/3ds-store'

const SITE_URL = process.env.SITE_URL || 'https://www.erhanflowers.com'

export async function POST(req: NextRequest) {
  if (!tamiEnabled()) {
    return NextResponse.json({ error: 'Online ödeme şu an aktif değil.' }, { status: 503 })
  }

  try {
    const body = await req.json()
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1'
    const callbackUrl = `${SITE_URL}/api/payment/tami/callback`
    const result = await initiate3DS({ ...body, musteri: { ...body.musteri, ip }, callbackUrl })

    if (!result.success || !result.threeDSHtmlContent) {
      return NextResponse.json(
        { error: result.errorMessage || 'Ödeme başlatılamadı.' },
        { status: 400 },
      )
    }

    const rawHtml = Buffer.from(result.threeDSHtmlContent, 'base64').toString('utf-8')
    console.log('[tami] 3ds html preview:', rawHtml.substring(0, 800))

    const forceSubmit = `<script>
(function(){
  function go(){
    var f=document.forms[0];
    if(f){f.submit();}
    else{var a=document.querySelector('a[href]');if(a)window.location.href=a.href;}
  }
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',go);}
  else{setTimeout(go,500);}
})();
</script>`
    const html = rawHtml.includes('</body>')
      ? rawHtml.replace('</body>', forceSubmit + '</body>')
      : rawHtml + forceSubmit

    const token = store3dsHtml(html)
    return NextResponse.json({ token })
  } catch (err) {
    console.error('tami initialize error:', err)
    return NextResponse.json({ error: 'Sunucu hatası.' }, { status: 500 })
  }
}
