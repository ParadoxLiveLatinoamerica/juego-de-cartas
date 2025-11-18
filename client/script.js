const socket = io();
let miId = null, salaId = null, miTurno = false, miNombre = "";

const menu = document.getElementById("menu");
const juego = document.getElementById("juego");
const campoRival = document.getElementById("campoRival");
const campoPropio = document.getElementById("campoPropio");
const manoPropia = document.getElementById("manoPropia");
const logDiv = document.getElementById("log");
const cartasJugadas = document.getElementById("cartasJ");
const overlayMoneda = document.getElementById("monedaOverlay");
const resultadoMoneda = document.getElementById("resultadoMoneda");

let atacante = null;
let estadoSala = null;

// Event Listeners
document.getElementById("crear").onclick = () => {
    miNombre = document.getElementById("nombre").value.trim() || "Jugador 1";
    socket.emit("crearSala", miNombre);
};

document.getElementById("unirse").onclick = () => {
    miNombre = document.getElementById("nombre").value.trim() || "Jugador 2";
    const code = document.getElementById("codigo").value.trim();
    if (code) socket.emit("unirseSala", { id: parseInt(code), nombre: miNombre });
};

document.getElementById("terminar").onclick = () => {
    socket.emit("terminarTurno", { salaId });
    atacante = null;
};

document.getElementById("moneda").onclick = () => socket.emit("lanzarMoneda", { salaId });

// Socket Events
socket.on("salaCreada", id => {
    document.getElementById("info").innerText = `✅ Sala creada: ${id}\n⏳ Esperando oponente...`;
    salaId = id;
});

socket.on("esperandoOponente", () => {
    document.getElementById("info").innerText = "⏳ Esperando al oponente...";
    menu.style.display = "flex";
    juego.style.display = "none";
});

socket.on("error", msg => {
    document.getElementById("info").innerText = `❌ ${msg}`;
});

socket.on("partidaIniciada", sala => {
    miId = socket.id;
    salaId = sala.id;
    menu.style.display = "none";
    juego.style.display = "block";
    actualizar(sala);
});

socket.on("actualizar", sala => {
    actualizar(sala);
});

socket.on("atacanteSeleccionado", data => {
    atacante = data.nombre;
    actualizarMensaje("⚔️ Haz DOBLE CLICK en un objetivo enemigo");
    if (estadoSala) {
        const opId = estadoSala.jugadores.find(id => id !== miId);
        renderCampo(estadoSala.campo[opId], campoRival, false);
        renderCampo(estadoSala.campo[miId], campoPropio, true);
    }
});

socket.on("victoria", data => {
    const ganaste = data.ganador === miId;
    mostrarResultado(ganaste);
});

socket.on("oponenteDesconectado", () => {
    alert("⚠️ El oponente se desconectó");
    setTimeout(() => location.reload(), 1000);
});

socket.on("monedaLanzada", data => {
    resultadoMoneda.innerText = data.resultado;
    resultadoMoneda.style.color = data.resultado === "Cara" ? "#51cf66" : "#ff6b6b";
    overlayMoneda.style.display = "flex";
    setTimeout(() => overlayMoneda.style.display = "none", 2500);
});

socket.on("habilidadMoneda", data => {
    resultadoMoneda.innerText = data.resultado;
    resultadoMoneda.style.color = data.resultado === "Cara" ? "#51cf66" : "#ff6b6b";
    overlayMoneda.style.display = "flex";
    
    setTimeout(() => {
        overlayMoneda.style.display = "none";
        if (data.mensaje) actualizarMensaje(data.mensaje);
    }, 2000);
});

// Funciones principales
function actualizar(sala) {
    estadoSala = sala;
    const opId = sala.jugadores.find(id => id !== miId);
    miTurno = sala.turno === miId;

    // Actualizar nombres
    document.getElementById("nombreJ1").innerText = sala.nombres[0];
    document.getElementById("nombreJ2").innerText = sala.nombres[1];
    
    // Actualizar HP
    document.getElementById("pvJ1").innerText = `❤️ ${sala.HP[sala.jugadores[0]]}`;
    document.getElementById("pvJ2").innerText = `❤️ ${sala.HP[sala.jugadores[1]]}`;

    // Actualizar stats
    document.getElementById("manoJ1").innerText = `🃏 ${sala.mano[sala.jugadores[0]].length}`;
    document.getElementById("mazoJ1").innerText = `📚 ${sala.mazo[sala.jugadores[0]].length}`;
    document.getElementById("manoJ2").innerText = `🃏 ${sala.mano[sala.jugadores[1]].length}`;
    document.getElementById("mazoJ2").innerText = `📚 ${sala.mazo[sala.jugadores[1]].length}`;

    // Actualizar turno
    const turnoDiv = document.getElementById("turno");
    if (miTurno) {
        turnoDiv.innerHTML = '<div class="turn-text">🟢 ¡TU TURNO!</div>';
        turnoDiv.className = "turn-indicator";
    } else {
        turnoDiv.innerHTML = '<div class="turn-text">🔴 Turno del rival</div>';
        turnoDiv.className = "turn-indicator enemy-turn";
    }

    cartasJugadas.innerText = sala.jugadasEsteTurno || 0;

    renderCampo(sala.campo[opId], campoRival, false);
    renderCampo(sala.campo[miId], campoPropio, true);
    renderMano(sala.mano[miId]);
    renderLog(sala.log);
}

function renderCampo(cartas, contenedor, esMio) {
    contenedor.innerHTML = "";
    
    if (cartas.length === 0) {
        contenedor.classList.add('empty');
        return;
    }
    
    contenedor.classList.remove('empty');
    
    cartas.forEach(c => {
        const div = document.createElement("div");
        div.className = "carta";
        
        // Marcar atacante seleccionado
        if (esMio && miTurno && atacante === c.nombre) {
            div.classList.add("seleccionada");
        }
        
        // Resaltar cartas enemigas como objetivos
        if (!esMio && miTurno && atacante) {
            div.style.border = "3px solid #ffd43b";
            div.style.boxShadow = "0 0 20px rgba(255, 212, 59, 0.8)";
            div.style.cursor = "crosshair";
            div.style.animation = "pulse 1s infinite";
        }
        
        // DOBLE CLICK para seleccionar atacante o atacar
        if (esMio && miTurno) {
            div.ondblclick = () => {
                seleccionarAtacante(c.nombre);
            };
            div.style.cursor = "pointer";
        } else if (!esMio && miTurno && atacante) {
            div.ondblclick = () => {
                atacar(c.nombre);
            };
        }

        // Imagen
        const img = document.createElement("img");
        const nombreArchivo = c.nombre.toLowerCase()
            .replace("kanata yatonokami", "kanata")
            .replace("nayuta yatonokami", "nayuta")
            .replace("miyama kei", "kei")
            .replace("naoakira saimon", "saimon")
            .replace("yeon hajun", "hajun")
            .replace(/ /g, '');
        
        img.src = `img/${nombreArchivo}.png`;
        img.alt = c.nombre;
        img.onerror = () => {
            div.style.background = "linear-gradient(135deg, #333, #666)";
            const texto = document.createElement("div");
            texto.style.cssText = "color:white; padding:10px; text-align:center; font-size:11px; position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); width:90%;";
            texto.innerText = c.nombre;
            div.appendChild(texto);
        };
        div.appendChild(img);

        // Daño
        const dano = document.createElement("div");
        dano.className = "dano";
        dano.innerText = c.dano;
        div.appendChild(dano);

        // Vida
        const vida = document.createElement("div");
        vida.className = "vida";
        vida.innerText = c.vida;
        div.appendChild(vida);

        contenedor.appendChild(div);
    });
}

function renderMano(mano) {
    manoPropia.innerHTML = "";
    
    mano.forEach(nombre => {
        const div = document.createElement("div");
        div.className = "carta";
        
        if (miTurno) {
            div.onclick = () => jugarCarta(nombre);
            div.style.cursor = "pointer";
        } else {
            div.style.cursor = "default";
            div.style.opacity = "0.6";
        }

        // Imagen
        const img = document.createElement("img");
        const nombreArchivo = nombre.toLowerCase()
            .replace("kanata yatonokami", "kanata")
            .replace("nayuta yatonokami", "nayuta")
            .replace("miyama kei", "kei")
            .replace("naoakira saimon", "saimon")
            .replace("yeon hajun", "hajun")
            .replace(/ /g, '');
        
        img.src = `img/${nombreArchivo}.png`;
        img.alt = nombre;
        img.onerror = () => {
            div.style.background = "linear-gradient(135deg, #667eea, #764ba2)";
            const texto = document.createElement("div");
            texto.style.cssText = "color:white; padding:10px; text-align:center; font-size:11px; position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); width:90%;";
            texto.innerText = nombre;
            div.appendChild(texto);
        };
        div.appendChild(img);

        // Daño
        const dano = document.createElement("div");
        dano.className = "dano";
        dano.innerText = CARTAS[nombre] ? CARTAS[nombre].dano : '?';
        div.appendChild(dano);

        manoPropia.appendChild(div);
    });
}

function renderLog(logs) {
    logDiv.innerHTML = logs.map(e => 
        `<div style="padding:8px; border-bottom:1px solid rgba(255,255,255,0.1);">
            <span style="color:#9d4edd; font-weight:bold;">${new Date().toLocaleTimeString()}</span> → ${e}
        </div>`
    ).join("");
    logDiv.scrollTop = 0;
}

function jugarCarta(nombre) {
    if (miTurno) {
        socket.emit("jugarCarta", { salaId, cartaNombre: nombre });
    }
}

function seleccionarAtacante(nombre) {
    if (miTurno) {
        socket.emit("seleccionarAtacante", { salaId, cartaNombre: nombre });
    }
}

function atacar(objetivo) {
    if (miTurno && atacante) {
        socket.emit("atacar", { salaId, objetivo });
        atacante = null;
    }
}

function mostrarResultado(ganaste) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.95);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
        backdrop-filter: blur(10px);
    `;
    
    const resultado = document.createElement('div');
    resultado.style.cssText = `
        text-align: center;
        padding: 50px;
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(20px);
        border-radius: 24px;
        border: 2px solid ${ganaste ? '#51cf66' : '#ff6b6b'};
        box-shadow: 0 0 50px ${ganaste ? 'rgba(81, 207, 102, 0.5)' : 'rgba(255, 107, 107, 0.5)'};
    `;
    
    resultado.innerHTML = `
        <div style="font-size: 120px; margin-bottom: 20px; animation: bounce 1s ease-in-out;">
            ${ganaste ? '🏆' : '💔'}
        </div>
        <h1 style="font-size: 48px; color: ${ganaste ? '#51cf66' : '#ff6b6b'}; margin-bottom: 20px; text-shadow: 0 0 20px currentColor;">
            ${ganaste ? '¡VICTORIA!' : 'DERROTA'}
        </h1>
        <p style="font-size: 20px; color: rgba(255, 255, 255, 0.7); margin-bottom: 30px;">
            ${ganaste ? '¡Has ganado la batalla!' : 'El rival ha ganado la batalla'}
        </p>
        <button onclick="location.reload()" style="
            padding: 15px 40px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 4px 20px rgba(157, 78, 221, 0.5);
        ">
            🔄 Nueva Partida
        </button>
    `;
    
    overlay.appendChild(resultado);
    document.body.appendChild(overlay);
}

function actualizarMensaje(msg) {
    const notif = document.createElement('div');
    notif.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(157, 78, 221, 0.9);
        color: white;
        padding: 15px 30px;
        border-radius: 12px;
        font-weight: bold;
        z-index: 1500;
        box-shadow: 0 4px 20px rgba(157, 78, 221, 0.5);
        animation: slideDown 0.3s ease-out;
    `;
    notif.innerText = msg;
    document.body.appendChild(notif);
    
    setTimeout(() => {
        notif.style.animation = 'slideUp 0.3s ease-out';
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}

// Animaciones CSS adicionales
const style = document.createElement('style');
style.textContent = `
    @keyframes bounce {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.2); }
    }
    
    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
        }
        to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
    }
    
    @keyframes slideUp {
        from {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
        to {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
        }
    }
`;
document.head.appendChild(style);

// OBJETO CARTAS
const CARTAS = {
    "Kanata Yatonokami": { grupo: "cozmez", tipo: "SSR+", dano: 3, elemento: "Hielo" },
    "Nayuta Yatonokami": { grupo: "cozmez", tipo: "SSR", dano: 2, elemento: "Hielo" },
    "Miyama Kei": { grupo: "1Nm8", tipo: "SSR+", dano: 3, elemento: "Luz" },
    "Naoakira Saimon": { grupo: "TCW", tipo: "SSR+", dano: 3, elemento: "Agua" },
    "Yeon Hajun": { grupo: "BAE", tipo: "SSR", dano: 2, elemento: "Agua" },
    "Rokuta": { grupo: "1Nm8", tipo: "SSR+", dano: 3, elemento: "Tierra" },
    "Itsuki": { grupo: "1Nm8", tipo: "SSR+", dano: 3, elemento: "Hielo" },
    "Shogo": { grupo: "VISTY", tipo: "SSR", dano: 2, elemento: "Fuego" },
    "Toma": { grupo: "VISTY", tipo: "SSR+", dano: 3, elemento: "Agua" },
    "Aoi": { grupo: "VISTY", tipo: "SSR", dano: 2, elemento: "Hielo" },
    "Kantaro": { grupo: "VISTY", tipo: "SSR+", dano: 3, elemento: "Rayo" },
    "Shiki": { grupo: "TCW", tipo: "SSR+", dano: 3, elemento: "Agua" },
    "Yohei": { grupo: "TCW", tipo: "SSR+", dano: 3, elemento: "Rayo" },
    "Ryu": { grupo: "TCW", tipo: "SSR", dano: 2, elemento: "Luz" },
    "Zen": { grupo: "AKYR", tipo: "SSR", dano: 2, elemento: "Tierra" },
    "Reo": { grupo: "AKYR", tipo: "SSR+", dano: 3, elemento: "Rayo" },
    "Satsuki": { grupo: "AKYR", tipo: "SSR", dano: 2, elemento: "Fuego" },
    "Hokusai": { grupo: "AKYR", tipo: "SSR", dano: 2, elemento: "Viento" },
    "Iori": { grupo: "AKYR", tipo: "SSR+", dano: 3, elemento: "Rayo" },
    "Ryoga": { grupo: "Goku Luck", tipo: "SSR+", dano: 3, elemento: "Tierra" },
    "Yuto": { grupo: "Goku Luck", tipo: "SSR", dano: 2, elemento: "Oscuridad" },
    "Kenta": { grupo: "Goku Luck", tipo: "SSR+", dano: 3, elemento: "Oscuridad" },
    "Shion": { grupo: "Goku Luck", tipo: "SSR+", dano: 3, elemento: "Viento" },
    "Anne": { grupo: "BAE", tipo: "SSR+", dano: 3, elemento: "Viento" },
    "Allen": { grupo: "BAE", tipo: "SSR+", dano: 3, elemento: "Fuego" },
    "Chisei": { grupo: "BURAIKAN", tipo: "SSR", dano: 2, elemento: "Luz" },
    "Haruomi": { grupo: "BURAIKAN", tipo: "SSR", dano: 2, elemento: "Oscuridad" },
    "Dongha": { grupo: "AMPRULE", tipo: "SSR", dano: 2, elemento: "Fuego" },
    "Chungsung": { grupo: "AMPRULE", tipo: "SSR+", dano: 3, elemento: "Oscuridad" }
};