import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import path from "path";
import { fileURLToPath } from 'url'; // Importar para corregir la ruta
import { iniciarPartida, manejarJugarCarta, manejarSeleccionAtacante, manejarAtaque, manejarFinTurno } from './gameLogic.js';

// --- CORRECCIÓN CLAVE ---
// Definir __filename y __dirname para que Node encuentre los archivos en Render
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// -------------------------

const app = express();
app.use(cors());

// LÍNEA CLAVE PARA SERVIR EL FRONT-END (client/index.html)
app.use(express.static(path.join(__dirname, "client"))); 

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

let salas = {};

io.on("connection", (socket) => {
    console.log("Jugador conectado:", socket.id);

    socket.on("crearSala", (nombre) => {
        const id = Math.floor(100000 + Math.random() * 900000);
        salas[id] = {
            jugadores: [socket.id],
            nombres: [nombre],
            estado: "esperando"
        };
        socket.join(id);
        console.log(`Sala ${id} creada por ${nombre}`);
        socket.emit("salaCreada", id);
    });

    socket.on("unirseSala", ({ id, nombre }) => {
        const sala = salas[id];
        if (!sala) {
            socket.emit("error", "Sala no existe");
            console.log(`Error: Sala ${id} no existe`);
            return;
        }
        if (sala.jugadores.length >= 2) {
            socket.emit("error", "Sala está llena");
            console.log(`Error: Sala ${id} está llena`);
            return;
        }
        sala.jugadores.push(socket.id);
        sala.nombres.push(nombre);
        socket.join(id);
        console.log(`${nombre} se unió a sala ${id}`);

        if (sala.jugadores.length === 2) {
            console.log(`Iniciando partida en sala ${id}`);
            iniciarPartida(id, sala, io);
        } else {
            socket.emit("esperandoOponente");
        }
    });

    socket.on("jugarCarta", (data) => {
        const sala = salas[data.salaId];
        if (sala) {
            console.log(`Jugador ${socket.id} juega carta: ${data.cartaNombre}`);
            manejarJugarCarta(socket.id, sala, data.cartaNombre, io);
        }
    });

    socket.on("seleccionarAtacante", (data) => {
        const sala = salas[data.salaId];
        if (sala) {
            console.log(`Jugador ${socket.id} selecciona atacante: ${data.cartaNombre}`);
            manejarSeleccionAtacante(socket.id, sala, data.cartaNombre, io);
        }
    });

    socket.on("atacar", (data) => {
        const sala = salas[data.salaId];
        if (sala) {
            console.log(`Jugador ${socket.id} ataca a: ${data.objetivo}`);
            manejarAtaque(socket.id, sala, data.objetivo, io);
        }
    });

    socket.on("terminarTurno", (data) => {
        const sala = salas[data.salaId];
        if (sala) {
            console.log(`Jugador ${socket.id} termina turno`);
            manejarFinTurno(socket.id, sala, io);
        }
    });

    socket.on("lanzarMoneda", (data) => {
        const sala = salas[data.salaId];
        if (sala && sala.turno === socket.id) {
            const resultado = Math.random() < 0.5 ? "Cara" : "Cruz";
            console.log(`Moneda lanzada en sala ${data.salaId}: ${resultado}`);
            io.to(data.salaId).emit("monedaLanzada", { resultado });
        }
    });

    socket.on("disconnect", () => {
        console.log("Jugador desconectado:", socket.id);
        for (const id in salas) {
            const sala = salas[id];
            const index = sala.jugadores.indexOf(socket.id);
            if (index !== -1) {
                sala.jugadores.splice(index, 1);
                sala.nombres.splice(index, 1);
                if (sala.jugadores.length === 0) {
                    console.log(`Sala ${id} eliminada (vacía)`);
                    delete salas[id];
                } else {
                    console.log(`Jugador desconectado de sala ${id}`);
                    io.to(id).emit("oponenteDesconectado");
                }
            }
        }
    });
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
    console.log(`🎮 Servidor iniciado en puerto ${PORT}`);
    console.log("✅ Esperando jugadores...");
});