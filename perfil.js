document.addEventListener("DOMContentLoaded", async function () {
    const SUPABASE_URL = "https://uuswtafwkgrzmzbkgnjq.supabase.co";
    const SUPABASE_KEY = "sb_publishable_vd6DmOxZuXD0cVhIJMtbfQ_-8cWtU7P";
    const CHAVE = "mzlink_sessao";
    const conteudo = document.getElementById("conteudo");

    let sessao = null;
    try { sessao = JSON.parse(localStorage.getItem(CHAVE)); } catch(e) {}

    if (!sessao || !sessao.access_token) {
        window.location.href = "login.html?next=perfil.html";
        return;
    }

    let user = null;
    let userMeta = null;
    let perfilDB = null;
    let arquivoAvatarOnboarding = null; 

    const headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": "Bearer " + sessao.access_token
    };

    try {
        const rUser = await fetch(SUPABASE_URL + "/auth/v1/user", { headers: headers });
        if (!rUser.ok) {
            localStorage.removeItem(CHAVE);
            window.location.href = "login.html";
            return;
        }
        user = await rUser.json();
        userMeta = user.user_metadata || {};

        const rPerfil = await fetch(SUPABASE_URL + "/rest/v1/profissionais?user_id=eq." + encodeURIComponent(user.id), { headers: headers });
        
        if (rPerfil.ok) {
            const lista = await rPerfil.json();
            // O RAIO-X: Vai mostrar uma caixa a dizer o que veio da base de dados
            if (lista && lista.length > 0) {
                alert("Raio-X do Supabase:\n\n" + JSON.stringify(lista[0], null, 2));
                perfilDB = lista.find(item => item.categoria === 'loja');
            }
        }

        if (!perfilDB) {
            renderizarOnboarding();
        } else {
            renderizarPerfil();
        }

    } catch (erro) {
        conteudo.innerHTML = `<div class="aviso erro visivel" style="margin:20px;">Erro de ligação. Tenta novamente.</div>`;
    }

    // ... (O resto das funções renderizarOnboarding, renderizarPerfil e guardar ficam IGUAIS ao código que te mandei antes)
    
    // COLA O RESTO DO CÓDIGO AQUI PARA NÃO DAR ERRO
