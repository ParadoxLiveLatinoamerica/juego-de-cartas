const MAX_CARTAS_MANO = 5;
const MAX_CARTAS_JUGADAS_POR_TURNO = 2; // Máximo 2 cartas por turno
const MAX_CARTAS_CAMPO = 5;             // Máximo 5 cartas en el campo
const VIDA_INICIAL = 20;
const VIDA_CARTA = 3;

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
    "Shiki": { grupo: "TCW", tipo: "SSR+", dano: 3, elemento: "Agua", habilidadMoneda: true },
    "Yohei": { grupo: "TCW", tipo: "SSR+", dano: 3, elemento: "Rayo", habilidadMoneda: true },
    "Ryu": { grupo: "TCW", tipo: "SSR", dano: 2, elemento: "Luz", habilidadMoneda: true },
    "Zen": { grupo: "AKYR", tipo: "SSR", dano: 2, elemento: "Tierra" },
    "Reo": { grupo: "AKYR", tipo: "SSR+", dano: 3, elemento: "Rayo" },
    "Satsuki": { grupo: "AKYR", tipo: "SSR", dano: 2, elemento: "Fuego" },
    "Hokusai": { grupo: "AKYR", tipo: "SSR", dano: 2, elemento: "Viento" },
    "Iori": { grupo: "AKYR", tipo: "SSR+", dano: 3, elemento: "Rayo", habilidadMoneda: true },
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

const SINERGIAS = {
    "Agua": ["Fuego"],
    "Fuego": ["Hielo"],
    "Hielo": ["Tierra"],
    "Tierra": ["Rayo"],
    "Rayo": ["Agua"]
};

const BARAJA_BASE = Object.keys(CARTAS);

function barajar(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function obtenerOponente(sala, id) {
    return sala.jugadores.find(p => p !== id);
}

function lanzarMoneda() {
    return Math.random() < 0.5 ? "Cara" : "Cruz";
}

function iniciarPartida(id, sala, io) {
    const [p1, p2] = sala.jugadores;
    
    const mazoBarajadoTotal = barajar(BARAJA_BASE);
    const mazo1Total = mazoBarajadoTotal.slice(0, 14);
    const mazo2Total = mazoBarajadoTotal.slice(14, 28); 
    
    const mano1 = mazo1Total.slice(0, 5);
    const mazo1 = mazo1Total.slice(5); 
    
    const mano2 = mazo2Total.slice(0, 5);
    const mazo2 = mazo2Total.slice(5); 
    
    sala.id = id;
    sala.HP = { [p1]: VIDA_INICIAL, [p2]: VIDA_INICIAL };
    sala.mano = { [p1]: mano1, [p2]: mano2 };
    sala.mazo = { [p1]: mazo1, [p2]: mazo2 };
    sala.campo = { [p1]: [], [p2]: [] };
    sala.turno = p1;
    sala.jugadasEsteTurno = 0;
    sala.turnoActual = 1;
    sala.efectos = { [p1]: {}, [p2]: {} };
    sala.log = ["¡La partida ha comenzado! Turno de " + sala.nombres[0] + "."];

    io.to(id).emit("partidaIniciada", sala);
}

function manejarJugarCarta(jugador, sala, nombre, io) {
    if (sala.turno !== jugador || sala.jugadasEsteTurno >= MAX_CARTAS_JUGADAS_POR_TURNO || sala.campo[jugador].length >= MAX_CARTAS_CAMPO) return;
    const i = sala.mano[jugador].indexOf(nombre);
    if (i === -1) return;

    sala.mano[jugador].splice(i, 1);
    const carta = { 
        nombre, 
        vida: VIDA_CARTA, 
        ...CARTAS[nombre],
        turnoInvocado: sala.turnoActual,
        estadosEspeciales: {}
    };
    sala.campo[jugador].push(carta);
    sala.jugadasEsteTurno++;

    const op = obtenerOponente(sala, jugador);
    
    ejecutarHabilidadAlInvocar(nombre, jugador, sala, io);
    
    if (verificarVictoriaBuraikan(jugador, sala, io)) return;
    
    sala.log.unshift(`${nombre} invocado.`);

    io.to(sala.id).emit("actualizar", sala);
}

function ejecutarHabilidadAlInvocar(nombre, jugador, sala, io) {
    let mensaje = "";
    const op = obtenerOponente(sala, jugador);

    if (sala.efectos[jugador]?.habilidadesSuprimidas && sala.efectos[jugador].habilidadesSuprimidas >= sala.turnoActual) {
        sala.log.unshift(`❌ Habilidades suprimidas! ${nombre} no activa su efecto.`);
        return;
    }
    
    switch(nombre) {
        case "Naoakira Saimon":
            sala.campo[jugador].forEach(c => {
                if (c.nombre !== nombre) c.vida = 3;
            });
            mensaje = "🍱 Saimon reparte almuerzos! Todas las cartas aliadas recuperan vida completa!";
            sala.log.unshift(mensaje);
            break;
            
        case "Itsuki":
            mensaje = `🔍 Itsuki espía la mano del rival.`;
            sala.log.unshift(mensaje);
            io.to(jugador).emit("habilidadMoneda", { 
                resultado: "👁️", 
                mensaje: `Mano rival: ${sala.mano[op].join(", ")}`
            });
            break;
            
        case "Zen":
            sala.campo[jugador].find(c => c.nombre === "Zen").estadosEspeciales.invencible = sala.turnoActual + 2; 
            mensaje = "🍰 Zen activa Cheat Day! Invencible por 2 turnos!";
            sala.log.unshift(mensaje);
            break;
            
        case "Dongha":
            sala.efectos[op].habilidadesSuprimidas = sala.turnoActual + 2;
            mensaje = "👑 Dongha activa Obediencia Absoluta! Habilidades enemigas suprimidas por 2 turnos!";
            sala.log.unshift(mensaje);
            break;
            
        case "Reo":
            sala.campo[jugador].find(c => c.nombre === "Reo").estadosEspeciales.gastoPesadoTurnos = 3;
            break;

        case "Aoi":
            sala.efectos[op].turnoSaltado = true;
            mensaje = "👑 Aoi activa Movimiento de Príncipe! El turno del rival será saltado.";
            sala.log.unshift(mensaje);
            break;
    }
}

function manejarLanzarMoneda(jugador, sala, io) {
    if (sala.turno !== jugador) return;
    
    const shiki = sala.campo[jugador].find(c => c.nombre === "Shiki");
    
    if (shiki) {
        const habilidadesSuprimidas = sala.efectos[jugador]?.habilidadesSuprimidas && sala.efectos[jugador].habilidadesSuprimidas >= sala.turnoActual; 
        if (habilidadesSuprimidas) {
            sala.log.unshift(`❌ Habilidades suprimidas! Shiki no puede usar su habilidad.`);
            io.to(sala.id).emit("actualizar", sala);
            return;
        }

        const resultadoShiki = lanzarMoneda();
        let mensaje = `🪙 Shiki: ${resultadoShiki}! `;

        if (resultadoShiki === "Cara") {
            sala.campo[jugador].forEach(c => {
                if (!c.estadosEspeciales.defensaExtra) c.estadosEspeciales.defensaExtra = 0;
                c.estadosEspeciales.defensaExtra += 1;
            });
            mensaje += "Interpretación de Plano! Todas las cartas aliadas +1 defensa!";
        } else {
            mensaje += "Falla. No pasa nada.";
        }

        sala.log.unshift(mensaje);
        io.to(sala.id).emit("habilidadMoneda", { resultado: resultadoShiki, mensaje: `Shiki lanza moneda: ${resultadoShiki}` });
        io.to(sala.id).emit("actualizar", sala);
        return;
    }

    const nombreJugador = sala.nombres[sala.jugadores.indexOf(jugador)];
    const resultado = lanzarMoneda();
    let mensajeLog = "";

    if (resultado === "Cara") {
        sala.HP[jugador] = Math.min(VIDA_INICIAL, sala.HP[jugador] + 1);
        mensajeLog = `🪙 ${nombreJugador} lanza la moneda: Cara! Gana +1 PV.`;
    } else {
        sala.HP[jugador] = Math.max(0, sala.HP[jugador] - 1);
        mensajeLog = `🪙 ${nombreJugador} lanza la moneda: Cruz! Pierde -1 PV.`;
        if (sala.HP[jugador] <= 0) {
            const op = obtenerOponente(sala, jugador);
            io.to(sala.id).emit("victoria", { ganador: op });
            return;
        }
    }

    sala.log.unshift(mensajeLog);
    io.to(sala.id).emit("habilidadMoneda", { resultado, mensaje: `Moneda: ${resultado}` });
    io.to(sala.id).emit("actualizar", sala);
}

function verificarVictoriaBuraikan(jugador, sala, io) {
    const tieneChisei = sala.campo[jugador].some(c => c.nombre === "Chisei");
    const tieneHaruomi = sala.campo[jugador].some(c => c.nombre === "Haruomi");
    
    if (tieneChisei && tieneHaruomi) {
        const op = obtenerOponente(sala, jugador);
        sala.campo[op] = [];
        sala.log.unshift("⚡ BURAIKAN! Chisei y Haruomi expulsan a todos los raperos enemigos!");
        io.to(sala.id).emit("victoria", { ganador: jugador });
        return true;
    }
    return false;
}

let atacanteSeleccionado = null;

function manejarSeleccionAtacante(jugador, sala, nombre, io) {
    if (sala.turno !== jugador) return;
    
    const carta = sala.campo[jugador].find(c => c.nombre === nombre);
    if (!carta) return;

    if (sala.ataqueRealizadoEsteTurno) {
        sala.log.unshift(`❌ Ya atacaste este turno! Solo puedes atacar una vez.`);
        io.to(sala.id).emit("actualizar", sala);
        return;
    }
    
    const habilidadesSuprimidas = sala.efectos[jugador]?.habilidadesSuprimidas && sala.efectos[jugador].habilidadesSuprimidas >= sala.turnoActual; 

    if (carta.estadosEspeciales.inmovilizado) {
        sala.log.unshift(`❌ ${nombre} está inmovilizado! No puede atacar!`);
        io.to(sala.id).emit("actualizar", sala);
        return;
    }
    
    if (carta.nombre === "Satsuki" && carta.estadosEspeciales.agotadoTurno && carta.estadosEspeciales.agotadoTurno >= sala.turnoActual) {
        sala.log.unshift(`❌ Satsuki está agotado! No puede atacar este turno!`);
        io.to(sala.id).emit("actualizar", sala);
        return;
    }
    
    if (carta.nombre === "Shiki" && !habilidadesSuprimidas) {
        const resultadoShiki = lanzarMoneda();
        let mensaje = `🪙 Shiki: ${resultadoShiki}! `;
        if (resultadoShiki === "Cara") {
            sala.campo[jugador].forEach(c => {
                if (!c.estadosEspeciales.defensaExtra) c.estadosEspeciales.defensaExtra = 0;
                c.estadosEspeciales.defensaExtra += 1;
            });
            mensaje += "Interpretación de Plano! Todas las cartas aliadas +1 defensa!";
        } else {
            mensaje += "Falla. No pasa nada.";
        }
        sala.log.unshift(mensaje);
        io.to(sala.id).emit("habilidadMoneda", { resultado: resultadoShiki, mensaje: `Shiki lanza moneda: ${resultadoShiki}` });
        io.to(sala.id).emit("actualizar", sala);
    } else if (carta.nombre === "Shiki" && habilidadesSuprimidas) {
        sala.log.unshift(`❌ Habilidades suprimidas! Shiki no activa su habilidad.`);
    }
    
    if (carta.nombre === "Yohei" && !habilidadesSuprimidas) {
        const resultado = lanzarMoneda();
        io.to(sala.id).emit("habilidadMoneda", { resultado, mensaje: `Yohei lanza moneda: ${resultado}` });
        if (resultado === "Cruz") {
            carta.estadosEspeciales.inmovilizado = true;
            sala.log.unshift(`🪙 Yohei: Cruz! Quedó inmovilizado!`);
            io.to(sala.id).emit("actualizar", sala);
            return;
        } else {
            sala.log.unshift(`🪙 Yohei: Cara! Continúa su ataque!`);
        }
    } else if (carta.nombre === "Yohei" && habilidadesSuprimidas) {
        sala.log.unshift(`❌ Habilidades suprimidas! Yohei no activa su habilidad de moneda.`);
    }
    
    atacanteSeleccionado = nombre;
    io.to(sala.id).emit("atacanteSeleccionado", { nombre });
}

function manejarAtaque(jugador, sala, objetivo, io) {
    if (sala.turno !== jugador || !atacanteSeleccionado) return;
    const op = obtenerOponente(sala, jugador);
    const cA = sala.campo[jugador].find(c => c.nombre === atacanteSeleccionado);
    let cO = sala.campo[op].find(c => c.nombre === objetivo);
    if (!cA || !cO) return;

    if (sala.ataqueRealizadoEsteTurno) return; 
    sala.ataqueRealizadoEsteTurno = true; 

    const habilidadesSuprimidasJugador = sala.efectos[jugador]?.habilidadesSuprimidas && sala.efectos[jugador].habilidadesSuprimidas >= sala.turnoActual;
    const habilidadesSuprimidasOponente = sala.efectos[op]?.habilidadesSuprimidas && sala.efectos[op].habilidadesSuprimidas >= sala.turnoActual;

    if (cO.nombre === "Toma" && !cO.estadosEspeciales.espejoUsado) {
        cO.estadosEspeciales.espejoUsado = true;
        const danoReflejado = calcularDanoAtaque(cA, cO, sala, jugador).dano;
        sala.HP[jugador] -= danoReflejado;
        cA.vida -= 1;
        sala.log.unshift(`🪞 Toma refleja el ataque! ${cA.nombre} recibe ${danoReflejado} PV y -1 vida!`);
        if (cA.vida <= 0) {
            sala.campo[jugador] = sala.campo[jugador].filter(c => c.nombre !== cA.nombre);
            sala.log.unshift(`💀 ${cA.nombre} eliminado!`);
        }
        if (sala.HP[jugador] <= 0) {
            io.to(sala.id).emit("victoria", { ganador: op });
            return;
        }
        atacanteSeleccionado = null;
        io.to(sala.id).emit("actualizar", sala);
        return;
    }

    if (cO.estadosEspeciales.invencible && cO.estadosEspeciales.invencible >= sala.turnoActual) {
        sala.log.unshift(`🛡️ ${cO.nombre} es invencible! El ataque no tiene efecto!`);
        atacanteSeleccionado = null;
        io.to(sala.id).emit("actualizar", sala);
        return;
    }

    const iori = sala.campo[op].find(c => c.nombre === "Iori");
    if (iori && cO.nombre !== "Iori" && !iori.estadosEspeciales.monedaUsada && !habilidadesSuprimidasOponente) { 
        const resultado = lanzarMoneda();
        iori.estadosEspeciales.monedaUsada = true; 
        if (resultado === "Cara") {
            const danoDevuelto = calcularDanoAtaque(cA, cO, sala, jugador).dano * 2;
            sala.HP[jugador] -= danoDevuelto;
            sala.log.unshift(`🪙 Iori: Cara! Lanzamiento Vengativo! Rival recibe ${danoDevuelto} PV!`);
            io.to(sala.id).emit("habilidadMoneda", { resultado, mensaje: `Iori devuelve ${danoDevuelto} de daño!` });
            if (sala.HP[jugador] <= 0) {
                io.to(sala.id).emit("victoria", { ganador: op });
                return;
            }
            atacanteSeleccionado = null;
            io.to(sala.id).emit("actualizar", sala);
            return; 
        } else {
            iori.vida -= 1; 
            sala.log.unshift(`🪙 Iori: Cruz! Iori interviene y falla. Pierde 1 vida.`);
            io.to(sala.id).emit("habilidadMoneda", { resultado, mensaje: "Iori falla y pierde 1 vida" });
            if (iori.vida <= 0) {
                sala.campo[op] = sala.campo[op].filter(c => c.nombre !== "Iori");
                sala.log.unshift(`💀 Iori eliminado!`);
            }
        }
    }

    // --- LÓGICA DE REDIRECCIÓN DE DAÑO (CORREGIDA) ---

    const hokusai = sala.campo[op].find(c => c.nombre === "Hokusai");
    if (hokusai && !hokusai.estadosEspeciales.absorcionUsada && cO.vida === 1) {
        hokusai.estadosEspeciales.absorcionUsada = true;
        hokusai.vida -= 1;
        const danoHP = calcularDanoAtaque(cA, hokusai, sala, jugador).dano;
        sala.HP[op] -= danoHP;
        sala.log.unshift(`🌸 Hokusai absorbe el ataque! -${danoHP} PV`);
        if (hokusai.vida <= 0) {
            sala.campo[op] = sala.campo[op].filter(c => c.nombre !== "Hokusai");
            sala.log.unshift(`💀 Hokusai eliminado!`);
        }
        if (sala.HP[op] <= 0) {
            io.to(sala.id).emit("victoria", { ganador: jugador });
            return;
        }
        atacanteSeleccionado = null;
        io.to(sala.id).emit("actualizar", sala);
        return;
    }

    const ryoga = sala.campo[op].find(c => c.nombre === "Ryoga");
    if (ryoga && cO.grupo === "Goku Luck" && cO.nombre !== "Ryoga") {
        ryoga.vida -= 1;
        const danoHP = calcularDanoAtaque(cA, ryoga, sala, jugador).dano;
        sala.HP[op] -= danoHP;
        sala.log.unshift(`🛡️ Ryoga absorbe el ataque! -${danoHP} PV`);
        if (ryoga.vida <= 0 && !ryoga.estadosEspeciales.turnosResistencia) {
            ryoga.estadosEspeciales.turnosResistencia = 2;
            sala.log.unshift(`💪 Ryoga resiste! 2 turnos más antes de morir!`);
        }
        if (sala.HP[op] <= 0) {
            io.to(sala.id).emit("victoria", { ganador: jugador });
            return;
        }
        atacanteSeleccionado = null;
        io.to(sala.id).emit("actualizar", sala);
        return;
    }

    const dongha = sala.campo[op].find(c => c.nombre === "Dongha");
    const chungsung = sala.campo[op].find(c => c.nombre === "Chungsung");
    if (dongha && chungsung && cO.nombre === "Dongha") {
        chungsung.vida -= 1;
        dongha.vida = Math.min(3, dongha.vida + 1);
        // Daño calculado contra Chungsung (Darkness) para Kenta/sinergias
        const danoHP = calcularDanoAtaque(cA, chungsung, sala, jugador).dano;
        sala.HP[op] -= danoHP;
        sala.log.unshift(`⚔️ Chungsung recibe el daño por Dongha! Dongha +1 vida, -${danoHP} PV`);
        if (chungsung.vida <= 0) {
            sala.campo[op] = sala.campo[op].filter(c => c.nombre !== "Chungsung");
            sala.log.unshift(`💀 Chungsung eliminado!`);
        }
        if (sala.HP[op] <= 0) {
            io.to(sala.id).emit("victoria", { ganador: jugador });
            return;
        }
        atacanteSeleccionado = null;
        io.to(sala.id).emit("actualizar", sala);
        return;
    }
    // --- FIN LÓGICA DE REDIRECCIÓN DE DAÑO ---

    const shion = sala.campo[op].find(c => c.nombre === "Shion");
    if (shion && sala.campo[op].length > 1) {
        const cartasDisponibles = sala.campo[op].filter(c => c.nombre !== objetivo);
        if (cartasDisponibles.length > 0) {
            const nuevoObjetivo = cartasDisponibles[Math.floor(Math.random() * cartasDisponibles.length)];
            sala.log.unshift(`💨 Shion desvía el ataque de ${cO.nombre} hacia ${nuevoObjetivo.nombre}!`);
            cO = nuevoObjetivo;
        }
    }

    if (cA.nombre === "Ryu" && !habilidadesSuprimidasJugador) {
        const resultado = lanzarMoneda();
        io.to(sala.id).emit("habilidadMoneda", { resultado, mensaje: `Ryu lanza moneda: ${resultado}` });
        if (resultado === "Cara") {
            sala.campo[op].forEach(c => c.estadosEspeciales.inmovilizado = true);
            sala.log.unshift(`🪙 Ryu: Cara! Enemigos inmovilizados!`);
        } else {
            sala.campo[jugador].forEach(c => c.estadosEspeciales.inmovilizado = true);
            sala.log.unshift(`🪙 Ryu: Cruz! Aliados inmovilizados!`);
        }
    } else if (cA.nombre === "Ryu" && habilidadesSuprimidasJugador) {
         sala.log.unshift(`❌ Habilidades suprimidas! Ryu no puede usar su habilidad.`);
    }

    if (cA.nombre === "Yuto" && cA.estadosEspeciales.golpeDecisivoListo) {
        cO.vida = 0;
        sala.log.unshift(`⚫ Yuto ejecuta Golpe Decisivo! Eliminado instantáneamente!`);
        cA.estadosEspeciales.golpeDecisivoListo = false;
    }

    const resultadoDano = calcularDanoAtaque(cA, cO, sala, jugador);
    let danoHP = resultadoDano.dano;
    
    if (resultadoDano.logMessage) {
        sala.log.unshift(resultadoDano.logMessage);
    }

    sala.HP[op] -= danoHP;
    cO.vida -= 1;

    sala.log.unshift(`⚔️ ${cA.nombre} ataca a ${cO.nombre} → -${danoHP} PV! ${cO.nombre}: ${cO.vida}/3`);

    if (cA.nombre === "Yeon Hajun") {
        cO.estadosEspeciales.fascinado = true;
        sala.log.unshift(`✨ ${cO.nombre} está fascinado!`);
    }

    if (cA.nombre === "Allen") {
        cO.estadosEspeciales.inmovilizado = true;
        sala.log.unshift(`💬 Allen inmoviliza a ${cO.nombre}!`);
    }

    if (cO.vida <= 0) {
        sala.campo[op] = sala.campo[op].filter(c => c.nombre !== cO.nombre);
        sala.log.unshift(`💀 ${cO.nombre} eliminado!`);
    }

    if (sala.HP[op] <= 0) {
        io.to(sala.id).emit("victoria", { ganador: jugador });
        return;
    }

    atacanteSeleccionado = null;
    io.to(sala.id).emit("actualizar", sala);
}

function calcularDanoAtaque(atacante, defensor, sala, jugador) {
    let dano = atacante.dano;
    let logMessage = null; 
    const defensorFascinado = defensor.estadosEspeciales.fascinado;

    if (atacante.nombre === "Kanata Yatonokami") {
        const tieneNayuta = sala.campo[jugador].some(c => c.nombre === "Nayuta Yatonokami");
        if (tieneNayuta && !defensorFascinado) {
            dano += 1;
        }
    }
    
    if (atacante.nombre === "Kantaro") {
        const aliados = sala.campo[jugador].length - 1;
        dano += aliados;
    }
    
    if (atacante.nombre === "Miyama Kei") {
        const op = obtenerOponente(sala, jugador);
        const totalRaperos = sala.campo[jugador].length + sala.campo[op].length;
        if (totalRaperos > 4) {
            dano = Math.max(1, dano - 1);
        }
    }
    
    const tieneShogo = sala.campo[jugador].some(c => c.nombre === "Shogo");
    if (tieneShogo && atacante.grupo === "VISTY" && !defensorFascinado) {
        dano += 1;
    }
    
    if (atacante.nombre === "Anne") {
        if (defensor.estadosEspeciales.inmovilizado || defensorFascinado) {
            dano += 1;
        }
    }
    
    if (atacante.nombre === "Reo" && atacante.estadosEspeciales.gastoPesadoTurnos > 0) {
        dano += 1;
    }
    
    if (atacante.nombre === "Satsuki" && atacante.estadosEspeciales.gaviaActiva) {
        dano += 1;
        atacante.estadosEspeciales.agotadoTurno = sala.turnoActual + 2; 
        atacante.estadosEspeciales.gaviaActiva = false;
        sala.log.unshift(`💥 Satsuki usa Gavia! +1 Daño y agotado próximo turno.`); 
    }
    
    // SINERGIA Y KENTA
    let sinergiaNaturalAplicada = false;
    if (SINERGIAS[atacante.elemento]?.includes(defensor.elemento)) {
        dano += 1;
        sinergiaNaturalAplicada = true; 
    }
    
    const kenta = sala.campo[jugador].find(c => c.nombre === "Kenta");
    if (!sinergiaNaturalAplicada && kenta && defensor.elemento !== "Luz" && defensor.elemento !== "Oscuridad" && defensor.elemento !== "Viento") {
        dano += 1;
        logMessage = `💻 Kenta hackea el elemento! +1 daño por debilidad.`;
    }
    
    if (defensor.estadosEspeciales.defensaExtra > 0 && !defensorFascinado) {
        dano = Math.max(1, dano - defensor.estadosEspeciales.defensaExtra);
    }
    
    if (defensor.nombre === "Zen" && defensor.estadosEspeciales.vulnerable) {
        dano += 1;
        sala.log.unshift(`⚠️ Zen es Vulnerable: +1 daño recibido!`);
    }
    
    return { dano: Math.max(1, dano), logMessage };
}

function manejarFinTurno(jugador, sala, io) {
    if (sala.turno !== jugador) return;
    const op = obtenerOponente(sala, jugador);

    if (sala.mazo[jugador].length > 0 && sala.mano[jugador].length < MAX_CARTAS_MANO) {
        sala.mano[jugador].push(sala.mazo[jugador].shift());
        sala.log.unshift(`+1 carta!`);
    }
    
    aplicarEfectosFinTurno(jugador, sala, io);
    
    let nombreJugador;

    if (sala.efectos[op]?.turnoSaltado) {
        sala.log.unshift(`❌ Movimiento de Príncipe de Aoi! Turno de rival saltado.`);
        delete sala.efectos[op].turnoSaltado;
        
        sala.turno = jugador;
        sala.turnoActual += 2;
        nombreJugador = sala.nombres[sala.jugadores.indexOf(jugador)];
        
    } else {
        sala.turno = op;
        sala.turnoActual++;
        nombreJugador = sala.nombres[sala.jugadores.indexOf(op)];
    }
    
    sala.jugadasEsteTurno = 0;
    sala.ataqueRealizadoEsteTurno = false; 
    atacanteSeleccionado = null;
    
    sala.log.unshift(`--- Turno ${sala.turnoActual}: ${nombreJugador} ---`);
    io.to(sala.id).emit("actualizar", sala);
}

function aplicarEfectosFinTurno(jugador, sala, io) {
    const op = obtenerOponente(sala, jugador);
    
    const nayuta = sala.campo[jugador].find(c => c.nombre === "Nayuta Yatonokami");
    const kanata = sala.campo[jugador].find(c => c.nombre === "Kanata Yatonokami");
    if (nayuta && kanata && !kanata.estadosEspeciales.fascinado && kanata.vida < 3) {
        kanata.vida = Math.min(3, kanata.vida + 1);
        sala.log.unshift("💙 Nayuta cura a Kanata! +1 vida");
    }
    
    const rokuta = sala.campo[jugador].find(c => c.nombre === "Rokuta");
    if (rokuta && sala.turnoActual % 3 === 0 && sala.mano[op].length > 0) {
        sala.mano[op].splice(Math.floor(Math.random() * sala.mano[op].length), 1);
        sala.log.unshift(`🔀 Rokuta baraja y elimina una carta de la mano rival!`);
    }
    
    sala.campo[jugador].forEach(c => {
        if (c.nombre === "Reo" && c.estadosEspeciales.gastoPesadoTurnos > 0) {
            c.estadosEspeciales.gastoPesadoTurnos--;
            if (c.estadosEspeciales.gastoPesadoTurnos === 0) {
                 sala.log.unshift(`✅ Gasto Pesado de Reo ha finalizado.`);
            }
        }
        
        if (c.nombre === "Zen" && c.estadosEspeciales.invencible && c.estadosEspeciales.invencible < sala.turnoActual) {
            delete c.estadosEspeciales.invencible;
            c.estadosEspeciales.vulnerable = true;
            sala.log.unshift(`⚠️ ${c.nombre} ya no es invencible y está vulnerable!`);
        }
        
        if (c.nombre === "Satsuki") {
            const turnosEnCampo = sala.turnoActual - c.turnoInvocado;
            if (turnosEnCampo >= 3 && !c.estadosEspeciales.gaviaActiva && !c.estadosEspeciales.agotadoTurno) {
                c.estadosEspeciales.gaviaActiva = true;
                sala.log.unshift("🦅 Satsuki prepara Gavia!");
            }
            if (c.estadosEspeciales.agotadoTurno && c.estadosEspeciales.agotadoTurno <= sala.turnoActual) {
                delete c.estadosEspeciales.agotadoTurno;
            }
        }
        
        if (c.nombre === "Yuto") {const turnosEnCampo = sala.turnoActual - c.turnoInvocado;
            if (turnosEnCampo >= 3) {
                c.estadosEspeciales.golpeDecisivoListo = true;
                sala.log.unshift("⚫ Yuto: Golpe Decisivo listo!");
            }
        }
        
        if (c.estadosEspeciales.inmovilizado) {
            c.estadosEspeciales.inmovilizado = false;
        }
        if (c.estadosEspeciales.fascinado) {
            delete c.estadosEspeciales.fascinado;
        }
        if (c.nombre === "Iori" && c.estadosEspeciales.monedaUsada) {
            delete c.estadosEspeciales.monedaUsada;
        }
    });
    
    const ryogaJugador = sala.campo[jugador].find(c => c.nombre === "Ryoga");
    if (ryogaJugador && ryogaJugador.estadosEspeciales.turnosResistencia) {
        ryogaJugador.estadosEspeciales.turnosResistencia--;
        if (ryogaJugador.estadosEspeciales.turnosResistencia <= 0 && ryogaJugador.vida <= 0) {
            sala.campo[jugador] = sala.campo[jugador].filter(c => c.nombre !== "Ryoga");
            sala.log.unshift("💀 Ryoga finalmente cae!");
        }
    }
    
    if (sala.efectos[op]?.habilidadesSuprimidas && sala.efectos[op].habilidadesSuprimidas <= sala.turnoActual) {
        delete sala.efectos[op].habilidadesSuprimidas;
        sala.log.unshift("✅ Habilidades enemigas restauradas!");
    }
    
    sala.campo[jugador].forEach(c => {
        if (c.nombre === "Hokusai" && c.estadosEspeciales.absorcionUsada) {
            delete c.estadosEspeciales.absorcionUsada;
        }
        if (c.nombre === "Toma" && c.estadosEspeciales.espejoUsado) {
            delete c.estadosEspeciales.espejoUsado;
        }
    });
}

export { iniciarPartida, manejarJugarCarta, manejarSeleccionAtacante, manejarAtaque, manejarFinTurno, manejarLanzarMoneda };