document.addEventListener("DOMContentLoaded", async function () {
    const SUPABASE_URL = "https://uuswtafwkgrzmzbkgnjq.supabase.co";
    const SUPABASE_KEY = "sb_publishable_vd6DmOxZuXD0cVhIJMtbfQ_-8cWtU7P";

    const lojaHeader = document.getElementById("lojaHeader");
    const gridAnuncios = document.getElementById("gridAnuncios");

    // 1. Pega o ID do vendedor na URL
    const urlParams = new URLSearchParams(window.location.search);
    const vendedorId = urlParams.get('id');

    if (!vendedorId) {
        lojaHeader.innerHTML = "<h1 style='color:white;'>Vendedor não encontrado.</h1><a href='index.html' class='btn-voltar-loja'>Voltar ao Início</a>";
        return;
    }

    try {
        // 2. Vai buscar todos os anúncios deste vendedor
        const res = await fetch(SUPABASE_URL + `/rest/v1/profissionais?user_id=eq.${vendedorId}&order=criado_em.desc`, {
            headers: { apikey: SUPABASE_KEY }
        });
        const todosDados = await res.json();

        if (todosDados.length === 0) {
            lojaHeader.innerHTML = "<h1 style='color:white;'>Loja sem anúncios.</h1><a href='index.html' class='btn-voltar-loja'>Voltar ao Início</a>";
            return;
        }

        // 3. Separa a linha do Perfil da Loja dos Anúncios reais
        const perfilLoja = todosDados.find(item => item.categoria === 'loja') || todosDados[0];
        const listaAnuncios = todosDados.filter(item => item.categoria !== 'loja');

        // 4. Monta o Cabeçalho da Loja
        const isPremium = perfilLoja.plano === "premium";
        const isEmpresa = perfilLoja.tipo_conta === "empresa";
        const inicial = perfilLoja.nome.charAt(0).toUpperCase();

        // Tenta buscar a foto de perfil no user_metadata (se tiveres acesso público), senão usa a inicial
        // Como não podemos ler o auth.users publicamente, se a foto estiver no perfil da loja, usamos. 
        // (Nota: O avatar_url está no auth, então aqui só mostramos a inicial para ser seguro)
        
        let badgesHTML = `
            <span class="badge ${isPremium ? 'badge-premium' : 'badge-basico'}">${isPremium ? '⭐ PREMIUM' : '🆓 Básico'}</span>
            ${isEmpresa ? '<span class="badge badge-empresa">🏢 EMPRESA</span>' : ''}
        `;

        let avaliacaoHTML = "";
        if (perfilLoja.total_avaliacoes > 0) {
            avaliacaoHTML = `⭐ ${Number(perfilLoja.media_estrelas).toFixed(1)} (${perfilLoja.total_avaliacoes} avaliações)`;
        } else {
            avaliacaoHTML = `Ainda sem avaliações`;
        }

        // Link do whatsapp da loja
        const numLoja = String(perfilLoja.whatsapp).replace(/\D/g, "");
        const msgLoja = encodeURIComponent("Olá " + perfilLoja.nome + ", vi a sua loja no MZLINK e gostaria de falar consigo.");

        lojaHeader.innerHTML = `
            <a href="index.html" style="position:absolute; top:20px; left:20px; color:#d4af37; text-decoration:none; font-weight:bold;">← Início</a>
            
            <div class="loja-avatar" style="${isPremium ? 'border-color: #1a1a1a;' : ''}">
                ${inicial}
            </div>
            
            <h1 class="loja-nome">${perfilLoja.nome}</h1>
            
            <div class="loja-badges">${badgesHTML}</div>
            
            <div class="loja-local">📍 ${perfilLoja.local}</div>
            <div class="loja-avaliacao">${avaliacaoHTML}</div>
            
            <a href="https://wa.me/${numLoja}?text=${msgLoja}" target="_blank" style="display:inline-block; background:#25D366; color:white; padding:10px 25px; border-radius:8px; text-decoration:none; font-weight:800; font-size:0.9rem; margin-top:10px;">💬 Falar com a Loja</a>
        `;

        // 5. Monta a grelha de anúncios
        gridAnuncios.innerHTML = ""; // limpa

        if (listaAnuncios.length === 0) {
            gridAnuncios.innerHTML = "<p style='text-align:center; color:#667085; grid-column: 1/-1;'>Este vendedor ainda não publicou produtos.</p>";
        }

        listaAnuncios.forEach(item => {
            const fotos = item.fotos || [];
            const imgHTML = fotos.length > 0 
                ? `<img src="${fotos[0]}" alt="${item.tipo}">` 
                : `<div style="height:200px; background:#eef1f5; display:flex; align-items:center; justify-content:center; color:#a0a0a0;">Sem foto</div>`;
            
            const precoHTML = item.preco ? `💰 ${item.preco} MT` : `Preço a combinar`;
            const numAnuncio = String(item.whatsapp).replace(/\D/g, "");
            const msgAnuncio = encodeURIComponent("Olá " + item.nome + ", vi o seu anúncio '" + item.tipo + "' no MZLINK e gostaria de saber mais.");

            gridAnuncios.innerHTML += `
                <div class="card-anuncio">
                    ${imgHTML}
                    <div class="conteudo">
                        <h3>${item.tipo}</h3>
                        <div class="preco">${precoHTML}</div>
                        <div class="local">📍 ${item.local} | ${item.estado || 'Usado'}</div>
                        <a href="https://wa.me/${numAnuncio}?text=${msgAnuncio}" class="btn-wa" target="_blank">Contactar Vendedor</a>
                    </div>
                </div>
            `;
        });

    } catch (erro) {
        console.error("Erro ao carregar perfil do vendedor:", erro);
        lojaHeader.innerHTML = "<h1 style='color:white;'>Erro ao carregar a loja.</h1><a href='index.html' class='btn-voltar-loja'>Voltar ao Início</a>";
    }
});
