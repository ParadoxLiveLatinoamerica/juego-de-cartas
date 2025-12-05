import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { 
    iniciarPartida, 
    manejarJugarCarta, 
    manejarSeleccionAtacante, 
    manejarAtaque, 
    manejarFinTurno, 
    manejarLanzarMoneda
} from './gameLogic.js';

const app = express();
const server = createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const clientPath = join(__dirname, 'client'); 

app.use(express.static(clientPath));

app.get('/', (req, res) => {
    res.sendFile(join(clientPath, 'index.html'));
});

// Estructura para almacenar las salas de juego
const salas = {};

// Función para generar código de sala aleatorio de 6 dígitos
function generarCodigoSala() {
    let codigo;
    do {
        codigo = Math.floor(100000 + Math.random() * 900000);
    } while (salas[codigo]);
    return codigo;
}

// Mapa para rastrear jugadores y sus salas (para reconexión)
const jugadorSala = {}; // { socketId: { salaId, nombreJugador, jugadorIndex, esEspectador } }

io.on('connection', (socket) => {
    console.log(`Usuario conectado: ${socket.id}`);

    // --- MANEJO DE SALAS ---

    socket.on('crearSala', (nombre) => {
        const salaId = generarCodigoSala();
        salas[salaId] = {
            id: salaId,
            jugadores: [socket.id],
            nombres: [nombre],
            espectadores: [], // Array de espectadores
            estado: 'espera',
            log: [`Sala ${salaId} creada por ${nombre}.`],
            jugadoresOriginales: [socket.id]
        };
        
        jugadorSala[socket.id] = {
            salaId: salaId,
            nombreJugador: nombre,
            jugadorIndex: 0,
            esEspectador: false
        };
        
        socket.join(salaId);
        socket.emit('salaCreada', salaId);
        console.log(`Sala ${salaId} creada por ${nombre}.`);
    });

    socket.on('unirseSala', ({ id, nombre }) => {
        const salaId = parseInt(id);
        const sala = salas[salaId];

        if (!sala) {
            socket.emit('error', 'La sala no existe.');
            return;
        }

        // CASO 1: Sala en espera - unirse por primera vez
        if (sala.estado === 'espera' && sala.jugadores.length === 1) {
            sala.jugadores.push(socket.id);
            sala.nombres.push(nombre);
            sala.estado = 'jugando';
            sala.jugadoresOriginales = [...sala.jugadores];
            
            jugadorSala[socket.id] = {
                salaId: salaId,
                nombreJugador: nombre,
                jugadorIndex: 1,
                esEspectador: false
            };
            
            socket.join(salaId);
            console.log(`${nombre} se unió a la sala ${salaId}.`);
            
            io.to(salaId).emit('salaLlena', { 
                id: salaId, 
                nombreP1: sala.nombres[0], 
                nombreP2: sala.nombres[1] 
            });
            
            // Iniciar la partida
            iniciarPartida(salaId, sala, io);
            return;
        }

        // CASO 2: Reconexión - el jugador estaba en esta sala
        if (sala.estado === 'jugando') {
            const infoJugador = jugadorSala[socket.id];
            
            if (infoJugador && infoJugador.salaId === salaId) {
                socket.join(salaId);
                console.log(`${nombre} se reconectó a la sala ${salaId} con el mismo socket.`);
                socket.emit('reconectado', sala);
                return;
            }
            
            // Buscar si el nombre del jugador coincide con alguno de los jugadores originales
            const indexJugador = sala.nombres.indexOf(nombre);
            
            if (indexJugador !== -1) {
                const socketAnterior = sala.jugadores[indexJugador];
                
                console.log(`${nombre} se reconectó a la sala ${salaId}. Socket anterior: ${socketAnterior}, nuevo: ${socket.id}`);
                
                sala.jugadores[indexJugador] = socket.id;
                
                if (sala.turno === socketAnterior) {
                    sala.turno = socket.id;
                }
                
                if (sala.campo) {
                    sala.campo[socket.id] = sala.campo[socketAnterior];
                    delete sala.campo[socketAnterior];
                }
                if (sala.mano) {
                    sala.mano[socket.id] = sala.mano[socketAnterior];
                    delete sala.mano[socketAnterior];
                }
                if (sala.mazo) {
                    sala.mazo[socket.id] = sala.mazo[socketAnterior];
                    delete sala.mazo[socketAnterior];
                }
                if (sala.HP) {
                    sala.HP[socket.id] = sala.HP[socketAnterior];
                    delete sala.HP[socketAnterior];
                }
                
                delete jugadorSala[socketAnterior];
                jugadorSala[socket.id] = {
                    salaId: salaId,
                    nombreJugador: nombre,
                    jugadorIndex: indexJugador,
                    esEspectador: false
                };
                
                socket.join(salaId);
                
                socket.emit('reconectado', sala);
                const otroSocketId = sala.jugadores.find(id => id !== socket.id);
                if (otroSocketId) {
                    io.to(otroSocketId).emit('oponenteReconectado', nombre);
                }
                
                io.to(salaId).emit('actualizar', sala);
                
                return;
            }
        }

        socket.emit('error', 'No puedes unirte a esta sala. Verifica el código o usa el nombre correcto para reconectarte.');
    });

    // NUEVO: Unirse como espectador
    socket.on('unirseComoEspectador', ({ id, nombre }) => {
        const salaId = parseInt(id);
        const sala = salas[salaId];

        if (!sala) {
            socket.emit('error', 'La sala no existe.');
            return;
        }

        if (sala.estado !== 'jugando') {
            socket.emit('error', 'La partida aún no ha comenzado. Espera a que comience para ser espectador.');
            return;
        }

        // Agregar al array de espectadores
        if (!sala.espectadores) {
            sala.espectadores = [];
        }
        
        sala.espectadores.push({
            id: socket.id,
            nombre: nombre || `Espectador ${sala.espectadores.length + 1}`
        });

        jugadorSala[socket.id] = {
            salaId: salaId,
            nombreJugador: nombre,
            jugadorIndex: -1,
            esEspectador: true
        };

        socket.join(salaId);
        console.log(`${nombre} se unió como espectador a la sala ${salaId}.`);

        // Enviar estado actual de la partida al espectador
        socket.emit('modoEspectador', {
            sala: sala,
            mensaje: `Te has unido como espectador a la sala ${salaId}`
        });

        // Notificar a los jugadores
        const nombreEspectador = nombre || 'Un espectador';
        io.to(salaId).emit('nuevoEspectador', {
            nombre: nombreEspectador,
            total: sala.espectadores.length
        });
    });

    // --- MANEJO DE JUEGO (Eventos del cliente) ---

    socket.on('jugarCarta', ({ salaId, nombreCarta }) => {
        const sala = salas[salaId];
        if (sala) {
            manejarJugarCarta(socket.id, sala, nombreCarta, io);
        }
    });

    socket.on('seleccionarAtacante', ({ salaId, nombreCarta }) => {
        const sala = salas[salaId];
        if (sala) {
            manejarSeleccionAtacante(socket.id, sala, nombreCarta, io);
        }
    });

    socket.on('atacarCarta', ({ salaId, nombreObjetivo }) => {
        const sala = salas[salaId];
        if (sala) {
            manejarAtaque(socket.id, sala, nombreObjetivo, io);
        }
    });

    socket.on('terminarTurno', ({ salaId }) => {
        const sala = salas[salaId];
        if (sala) {
            manejarFinTurno(socket.id, sala, io);
        }
    });

    socket.on('lanzarMoneda', ({ salaId }) => {
        const sala = salas[salaId];
        if (sala) {
            manejarLanzarMoneda(socket.id, sala, io);
        }
    });

    // --- DESCONEXIÓN ---

    socket.on('disconnect', () => {
        console.log(`Usuario desconectado: ${socket.id}`);
        
        const infoJugador = jugadorSala[socket.id];
        
        if (infoJugador) {
            const sala = salas[infoJugador.salaId];
            
            // Si es espectador
            if (infoJugador.esEspectador && sala) {
                sala.espectadores = sala.espectadores.filter(esp => esp.id !== socket.id);
                console.log(`Espectador ${infoJugador.nombreJugador} desconectado de sala ${infoJugador.salaId}.`);
                
                io.to(infoJugador.salaId).emit('espectadorDesconectado', {
                    nombre: infoJugador.nombreJugador,
                    total: sala.espectadores.length
                });
                
                delete jugadorSala[socket.id];
                return;
            }
            
            // Si es jugador
            if (sala && sala.estado === 'jugando') {
                console.log(`Jugador ${infoJugador.nombreJugador} desconectado de sala ${infoJugador.salaId}. Esperando reconexión...`);
                
                const otroSocketId = sala.jugadores.find(id => id !== socket.id);
                if (otroSocketId) {
                    io.to(otroSocketId).emit('oponenteDesconectado', {
                        mensaje: `${infoJugador.nombreJugador} se desconectó. Esperando reconexión...`
                    });
                }
                
                // Notificar a espectadores
                if (sala.espectadores && sala.espectadores.length > 0) {
                    sala.espectadores.forEach(esp => {
                        io.to(esp.id).emit('jugadorDesconectado', {
                            mensaje: `${infoJugador.nombreJugador} se desconectó. Esperando reconexión...`
                        });
                    });
                }
                
                setTimeout(() => {
                    const salaActual = salas[infoJugador.salaId];
                    
                    if (salaActual && salaActual.jugadores.includes(socket.id)) {
                        console.log(`Timeout: Eliminando sala ${infoJugador.salaId} por desconexión prolongada.`);
                        
                        const otroIndex = sala.jugadores.indexOf(socket.id) === 0 ? 1 : 0;
                        const ganadorId = sala.jugadores[otroIndex];
                        
                        if (ganadorId && ganadorId !== socket.id) {
                            io.to(ganadorId).emit('victoria', {
                                ganador: ganadorId,
                                mensaje: 'El rival no se reconectó. ¡Has ganado!'
                            });
                        }
                        
                        // Notificar a espectadores
                        if (salaActual.espectadores) {
                            salaActual.espectadores.forEach(esp => {
                                io.to(esp.id).emit('partidaTerminada', {
                                    mensaje: 'La partida ha terminado por desconexión'
                                });
                            });
                        }
                        
                        delete jugadorSala[socket.id];
                        delete salas[infoJugador.salaId];
                    }
                }, 60000);
                
            } else if (sala && sala.estado === 'espera') {
                delete salas[infoJugador.salaId];
                delete jugadorSala[socket.id];
                console.log(`Sala ${infoJugador.salaId} eliminada (estaba en espera).`);
            }
        }
    });
});

server.listen(PORT, () => {
    console.log(`Servidor de Paradox Live Battle iniciado en http://localhost:${PORT}`);
});