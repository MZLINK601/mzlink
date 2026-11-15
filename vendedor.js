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

    // ===== A MÁGICA DAS VISUALIZAÇÕES =====
    try {
        fetch(SUPABASE_URL + "/rest/v1/rpc/registar_visualizacao", {
            method: "POST",
            headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
            body: JSON.stringify({ user_uuid: vendedorId })
        });
    } catch (e) { /* silencioso */ }

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

        let numLoja = String(perfilLoja.whatsapp || "").replace(/\D/g, "");
        if (numLoja && !numLoja.startsWith("258")) numLoja = "258" + numLoja;
        
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
        gridAnuncios.innerHTML = ""; 

        if (listaAnuncios.length === 0) {
            gridAnuncios.innerHTML = "<p style='text-align:center; color:#667085; grid-column: 1/-1;'>Este vendedor ainda não publicou produtos.</p>";
        }

        listaAnuncios.forEach(item => {
            const fotos = item.fotos || [];
            const imgHTML = fotos.length > 0 
                ? `<img src="${fotos[0]}" alt="${item.tipo}" loading="lazy">` 
                : `<div style="height:200px; background:#eef1f5; display:flex; align-items:center; justify-content:center; color:#a0a0a0;">Sem foto</div>`;
            
            let numAnuncio = String(item.whatsapp || "").replace(/\D/g, "");
            if (numAnuncio && !numAnuncio.startsWith("258")) numAnuncio = "258" + numAnuncio;
            const msgAnuncio = encodeURIComponent("Olá " + item.nome + ", vi o seu anúncio '" + item.tipo + "' no MZLINK e gostaria de saber mais.");

            // ===== AQUI ESTÁ A MÁGICA DA PROTEÇÃO =====
            let precoHTML = "";
            let botoesHTML = "";

            if (item.preco && Number(item.preco) > 0) {
                // Preço Fixo -> Escrow
                const precoBase = Number(item.preco);
                let taxa = precoBase * 0.04; 
                if (taxa > 500) taxa = 500; 
                const precoFinal = precoBase + taxa;

                precoHTML = `<div class="preco">💰 ${precoFinal.toFixed(2)} MT</div><p style="font-size:0.7rem; color:#667085; margin-top:-10px; margin-bottom:10px;">🛡️ Inclui taxa de Proteção</p>`;
                botoesHTML = `<button onclick="iniciarCompraProtegida('${item.id}', ${precoFinal})" class="btn-escrow">🛡️ Comprar Protegido</button>`;
            } else {
                // Preço a Combinar -> WhatsApp
                precoHTML = `<div class="preco" style="color:#667085;">Preço a combinar</div>`;
                botoesHTML = `<a href="https://wa.me/${numAnuncio}?text=${msgAnuncio}" class="btn-wa" target="_blank">Contactar Vendedor</a>`;
            }

            gridAnuncios.innerHTML += `
                <div class="card-anuncio">
                    ${imgHTML}
                    <div class="conteudo">
                        <h3>${item.tipo}</h3>
                        ${precoHTML}
                        <div class="local">📍 ${item.local} | ${item.estado || 'Usado'}</div>
                        ${botoesHTML}
                    </div>
                </div>
            `;
        });

    } catch (erro) {
        console.error("Erro ao carregar perfil do vendedor:", erro);
        lojaHeader.innerHTML = "<h1 style='color:white;'>Erro ao carregar a loja.</h1><a href='index.html' class='btn-voltar-loja'>Voltar ao Início</a>";
    }
});

// ==========================================
// LÓGICA DO MODAL DE PAGAMENTO PROTEGIDO
// ==========================================
let produtoAtualCompra = null;
let valorAtualCompra = 0;

window.iniciarCompraProtegida = function(produtoId, valorTotal) {
    let sessao = null;
    try { sessao = JSON.parse(localStorage.getItem("mzlink_sessao")); } catch(e) {}

    if (!sessao || !sessao.access_token) {
        alert("⚠️ Para comprar com Proteção MZLINK, precisas de estar logado.\n\nVais ser redirecionado para o login.");
        window.location.href = "login.html";
        return;
    }

    produtoAtualCompra = produtoId;
    valorAtualCompra = valorTotal;

    document.getElementById('valorTotalPagamento').innerText = valorTotal.toFixed(2) + " MT";
    document.getElementById('inputComprovativoCompra').value = "";
    document.getElementById('msgCodigoCompra').innerText = "";
    document.getElementById('modalPagamento').style.display = 'flex';
};

document.getElementById('inputComprovativoCompra')?.addEventListener('input', function() {
    const texto = this.value.trim();
    const msg = document.getElementById('msgCodigoCompra');
    
    const regexMpesa = /(?:Confirmado|ID|TxID|Ref)\s*([A-Z0-9]{9,10})/i;
    const matchMpesa = texto.match(regexMpesa);
    const regexEmola = /\b\d{10}\b/;
    const matchEmola = texto.match(regexEmola);

    let codigo = null;
    let valido = false;
    const apenasCodigo = /^[A-Z0-9]{9,10}$/i.test(texto);

    if (apenasCodigo) {
        codigo = texto.toUpperCase();
        valido = true;
    } else if (matchMpesa && matchMpesa[1]) {
        codigo = matchMpesa[1].toUpperCase();
        if (texto.includes("852337913") || texto.toUpperCase().includes("AMÓS")) valido = true;
    } else if (matchEmola && matchEmola[0]) {
        codigo = matchEmola[0];
        if (texto.includes("879608566") || texto.toUpperCase().includes("CELESTE")) valido = true;
    }

    if (codigo) {
        this.value = codigo; 
        if (valido) {
            msg.innerText = "✅ Código detetado com sucesso!";
            msg.style.color = "#16a34a";
        } else {
            msg.innerText = "⚠️ Pagamento para outro número! Verifica.";
            msg.style.color = "#dc2626";
        }
    } else {
        msg.innerText = "";
    }
});

document.getElementById('btnConfirmarPagamento')?.addEventListener('click', async function() {
    const comprovativo = document.getElementById('inputComprovativoCompra').value.trim();
    const msg = document.getElementById('msgCodigoCompra');
    
    if (!comprovativo) return alert("Cola o código do comprovativo primeiro.");
    if (msg.style.color === 'rgb(220, 38, 38)') return alert("❌ O pagamento não foi feito para os números do MZLINK.");

    this.innerText = "A processar...";
    this.disabled = true;

    try {
        let sessao = JSON.parse(localStorage.getItem("mzlink_sessao"));
        const SUPABASE_URL = "https://uuswtafwkgrzmzbkgnjq.supabase.co";
        const SUPABASE_KEY = "sb_publishable_vd6DmOxZuXD0cVhIJMtbfQ_-8cWtU7P";

        const userRes = await fetch(SUPABASE_URL + "/auth/v1/user", { headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + sessao.access_token } });
        const user = await userRes.json();

        const produtoRes = await fetch(SUPABASE_URL + "/rest/v1/profissionais?id=eq." + produtoAtualCompra + "&select=user_id,whatsapp", { headers: { apikey: SUPABASE_KEY } });
        const produtoDados = await produtoRes.json();
        
        if (produtoDados.length === 0) throw new Error("Produto não encontrado.");
        const vendedorId = produtoDados[0].user_id;
        const vendedorWhatsapp = produtoDados[0].whatsapp;

        const vendaRes = await fetch(SUPABASE_URL + "/rest/v1/vendas_protegidas", {
            method: "POST",
            headers: { "apikey": SUPABASE_KEY, "Authorization": "Bearer " + sessao.access_token, "Content-Type": "application/json" },
            body: JSON.stringify({
                produto_id: produtoAtualCompra,
                comprador_id: user.id,
                vendedor_id: vendedorId,
                valor_produto: valorAtualCompra / 1.04,
                taxa_mzlink: valorAtualCompra - (valorAtualCompra / 1.04),
                valor_total: valorAtualCompra,
                status: "pago",
                comprovativo: comprovativo,
                whatsapp_comprador: user.user_metadata?.whatsapp || user.phone || "Não fornecido",
                whatsapp_vendedor: vendedorWhatsapp
            })
        });

        if (vendaRes.ok) {
            alert("🎉 Pagamento Confirmado!\n\nO vendedor foi notificado.");
            document.getElementById('modalPagamento').style.display = 'none';
        } else {
            throw new Error("Erro ao registar no banco de dados.");
        }

    } catch (err) {
        console.error(err);
        alert("❌ Erro ao processar pagamento. Tenta novamente.");
    } finally {
        this.innerText = "✅ Confirmar Pagamento";
        this.disabled = false;
    }
});
