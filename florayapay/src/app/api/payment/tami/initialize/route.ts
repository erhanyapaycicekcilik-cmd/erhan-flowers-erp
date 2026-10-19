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
    // orderId'yi callbackUrl'ye gömüş ol — Tami callback'e parametre göndermiyor
    const callbackUrl = `${SITE_URL}/api/payment/tami/callback?orderId=${encodeURIComponent(body.orderId)}`
    const result = await initiate3DS({ ...body, musteri: { ...body.musteri, ip }, callbackUrl })

    if (!result.success || !result.threeDSHtmlContent) {
      return NextResponse.json(
        { error: result.errorMessage || 'Ödeme başlatılamadı.' },
        { status: 400 },
      )
    }

    const rawHtml = Buffer.from(result.threeDSHtmlContent, 'base64').toString('utf-8')
    // Extract diagnostic info
    const formMatch = rawHtml.match(/<form[^>]*>/i)
    const actionMatch = rawHtml.match(/action=["']([^"']+)["']/i)
    const scriptSrcs = [...rawHtml.matchAll(/src=["']([^"']+)["']/gi)].map(m => m[1])
    console.log('[tami] form tag:', formMatch?.[0] || 'NOT FOUND')
    console.log('[tami] form action:', actionMatch?.[1] || 'NOT FOUND')
    console.log('[tami] script srcs:', scriptSrcs)
    console.log('[tami] html length:', rawHtml.length)
    console.log('[tami] html[0-2000]:', rawHtml.substring(0, 2000))

    const forceSubmit = `<script>
(function(){
  function go(){
    var f=document.forms[0];
    if(f){
      console.log('form found, action='+f.action+', method='+f.method);
      f.submit();
    } else {
      console.log('no form found, looking for redirect scripts');
      var a=document.querySelector('a[href]');
      if(a) window.location.href=a.href;
    }
  }
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',go);}
  else{setTimeout(go,800);}
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
