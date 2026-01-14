export default async (request, context) => {
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get("url");

  if (!targetUrl) {
    return new Response("Kullanım: /proxy?url=VIDEO_LINKI", { status: 400 });
  }

  try {
    // Google Drive için özel header'lar
    const headers = {
      "Range": request.headers.get("Range") || "",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept": "*/*",
      "Referer": "https://drive.google.com/"
    };

    let response = await fetch(targetUrl, { 
      headers,
      redirect: 'follow' // Google Drive redirect'lerini takip et
    });

    // Google Drive büyük dosyalar için virus scan uyarısı veriyor
    // Eğer HTML dönerse, confirmation linkini bul ve tekrar fetch et
    const contentType = response.headers.get("content-type") || "";
    
    if (contentType.includes("text/html")) {
      const html = await response.text();
      
      // Confirmation link'i bul (Google Drive büyük dosyalar için)
      const confirmMatch = html.match(/confirm=([^&"]+)/);
      if (confirmMatch) {
        const confirmUrl = targetUrl + "&confirm=" + confirmMatch[1];
        response = await fetch(confirmUrl, { 
          headers,
          redirect: 'follow'
        });
      } else {
        // Eğer HTML içinde download butonu varsa, onun linkini al
        const downloadMatch = html.match(/href="(\/uc\?export=download[^"]+)"/);
        if (downloadMatch) {
          const downloadUrl = "https://drive.google.com" + downloadMatch[1].replace(/&amp;/g, '&');
          response = await fetch(downloadUrl, { 
            headers,
            redirect: 'follow'
          });
        }
      }
    }

    const newResponse = new Response(response.body, response);
    
    // CORS İzinleri
    newResponse.headers.set("Access-Control-Allow-Origin", "*");
    newResponse.headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    newResponse.headers.set("Access-Control-Allow-Headers", "*");
    newResponse.headers.set("Access-Control-Expose-Headers", "*");

    return newResponse;

  } catch (error) {
    return new Response("Hata: " + error.message, { status: 500 });
  }
};