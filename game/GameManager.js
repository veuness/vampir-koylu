const { PHASES, ROLES, DEFAULT_TIMERS, ROLE_DESCRIPTIONS } = require('./constants');
const roomManager = require('./RoomManager');

class GameManager {
    constructor(io) {
        this.io = io;
        this.timers = new Map();
    }

    // Socket.io instance'ı ayarla
    setIO(io) {
        this.io = io;
    }

    // Oyunu başlat
    startGame(roomCode) {
        const room = roomManager.getRoom(roomCode);
        if (!room) return { success: false, error: 'Oda bulunamadı!' };

        // Rolleri dağıt
        const roleResult = roomManager.assignRoles(roomCode);
        if (!roleResult.success) return roleResult;

        // Oyunu rol gösterimi fazına geçir
        room.phase = PHASES.ROLE_REVEAL;
        room.round = 1;

        // Oyunculara rollerini bildir
        this.broadcastRoles(roomCode);

        // Rol gösterimi sonrası geceye geç
        this.startTimer(roomCode, DEFAULT_TIMERS.ROLE_REVEAL, () => {
            this.startNightPhase(roomCode);
        });

        return { success: true };
    }

    // Rolleri oyunculara bildir
    broadcastRoles(roomCode) {
        const room = roomManager.getRoom(roomCode);
        if (!room) return;

        // Her oyuncuya kendi rolünü gönder
        for (const [playerId, player] of room.players) {
            const roleInfo = ROLE_DESCRIPTIONS[player.role];

            // Vampirler diğer vampirleri görebilir
            let teammates = [];
            if (player.role === ROLES.VAMPIR) {
                for (const [otherId, otherPlayer] of room.players) {
                    if (otherPlayer.role === ROLES.VAMPIR && otherId !== playerId) {
                        teammates.push(otherPlayer.name);
                    }
                }
            }

            this.io.to(playerId).emit('role_assigned', {
                role: player.role,
                roleInfo,
                teammates
            });
        }

        // Genel oyun durumunu güncelle
        this.broadcastGameState(roomCode);
    }

    // Gece fazını başlat
    startNightPhase(roomCode) {
        const room = roomManager.getRoom(roomCode);
        if (!room) return;

        room.phase = PHASES.NIGHT;
        room.nightActions = {
            vampirTarget: null,
            doktorTarget: null,
            gozcuResults: new Map(),
            vampirVotes: new Map()
        };

        this.broadcastGameState(roomCode);

        // Gece zamanlayıcısı
        this.startTimer(roomCode, DEFAULT_TIMERS.NIGHT, () => {
            this.processNightActions(roomCode);
        });
    }

    // Gece aksiyonunu işle
    processNightAction(roomCode, playerId, targetId, actionType) {
        const room = roomManager.getRoom(roomCode);
        if (!room || room.phase !== PHASES.NIGHT) return { success: false };

        const player = room.players.get(playerId);
        if (!player || !player.isAlive) return { success: false };

        // Vampir saldırısı
        if (actionType === 'vampir_kill' && player.role === ROLES.VAMPIR) {
            room.nightActions.vampirVotes.set(playerId, targetId);

            // Tüm vampirler oy verdiyse hedefi belirle
            const aliveVampires = Array.from(room.players.values())
                .filter(p => p.role === ROLES.VAMPIR && p.isAlive);

            if (room.nightActions.vampirVotes.size >= aliveVampires.length) {
                const votes = {};
                for (const target of room.nightActions.vampirVotes.values()) {
                    votes[target] = (votes[target] || 0) + 1;
                }
                const maxVotes = Math.max(...Object.values(votes));
                const targets = Object.keys(votes).filter(t => votes[t] === maxVotes);
                room.nightActions.vampirTarget = targets[Math.floor(Math.random() * targets.length)];
            }

            return { success: true };
        }

        // Doktor koruma
        if (actionType === 'doktor_save' && player.role === ROLES.DOKTOR) {
            room.nightActions.doktorTarget = targetId;
            return { success: true };
        }

        // Gözcü sorgulama
        if (actionType === 'gozcu_check' && player.role === ROLES.GOZCU) {
            const targetPlayer = room.players.get(targetId);
            if (targetPlayer) {
                const isVampir = targetPlayer.role === ROLES.VAMPIR;
                room.nightActions.gozcuResults.set(playerId, {
                    targetId,
                    targetName: targetPlayer.name,
                    isVampir
                });

                // Gözcüye sonucu bildir
                this.io.to(playerId).emit('gozcu_result', {
                    targetName: targetPlayer.name,
                    isVampir
                });
            }
            return { success: true };
        }

        return { success: false };
    }

    // Gece aksiyonlarını sonuçlandır
    processNightActions(roomCode) {
        const room = roomManager.getRoom(roomCode);
        if (!room) return;

        let killedPlayer = null;
        const vampirTarget = room.nightActions.vampirTarget;
        const doktorTarget = room.nightActions.doktorTarget;

        // Eğer vampir hedefi doktor tarafından korunmadıysa öldür
        if (vampirTarget && vampirTarget !== doktorTarget) {
            const target = room.players.get(vampirTarget);
            if (target && target.isAlive) {
                target.isAlive = false;
                room.deadPlayers.add(vampirTarget);
                killedPlayer = target;
            }
        }

        // Gece sonucunu bildir
        this.io.to(roomCode).emit('night_result', {
            killed: killedPlayer ? {
                id: killedPlayer.id,
                name: killedPlayer.name
            } : null,
            saved: vampirTarget === doktorTarget && vampirTarget ? true : false
        });

        // Kazanan kontrolü
        const winner = this.checkWinCondition(roomCode);
        if (winner) {
            this.endGame(roomCode, winner);
            return;
        }

        // Gündüz fazına geç
        this.startDayPhase(roomCode);
    }

    // Gündüz fazını başlat
    startDayPhase(roomCode) {
        const room = roomManager.getRoom(roomCode);
        if (!room) return;

        room.phase = PHASES.DAY;

        this.broadcastGameState(roomCode);

        // Oda config'inden gündüz süresini al
        const dayTime = room.config?.timers?.day || DEFAULT_TIMERS.DAY;

        this.startTimer(roomCode, dayTime, () => {
            this.startVotingPhase(roomCode);
        });
    }

    // Oylama fazını başlat
    startVotingPhase(roomCode) {
        const room = roomManager.getRoom(roomCode);
        if (!room) return;

        room.phase = PHASES.VOTING;
        room.votes = new Map();

        this.broadcastGameState(roomCode);

        // Oda config'inden oylama süresini al
        const votingTime = room.config?.timers?.voting || DEFAULT_TIMERS.VOTING;

        this.startTimer(roomCode, votingTime, () => {
            this.processVotes(roomCode);
        });
    }

    // Oy ver
    vote(roomCode, voterId, targetId) {
        const room = roomManager.getRoom(roomCode);
        if (!room || room.phase !== PHASES.VOTING) return { success: false };

        const voter = room.players.get(voterId);
        if (!voter || !voter.isAlive) return { success: false };

        // Kendine oy veremez
        if (voterId === targetId) return { success: false, error: 'Kendine oy veremezsin!' };

        const target = room.players.get(targetId);
        if (!target || !target.isAlive) return { success: false };

        room.votes.set(voterId, targetId);

        // Oy durumunu bildir
        this.broadcastVoteStatus(roomCode);

        return { success: true };
    }

    // Oyları işle
    processVotes(roomCode) {
        const room = roomManager.getRoom(roomCode);
        if (!room) return;

        // Oyları say
        const voteCounts = {};
        for (const targetId of room.votes.values()) {
            voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
        }

        // En çok oy alanı bul
        let maxVotes = 0;
        let eliminated = null;

        for (const [targetId, count] of Object.entries(voteCounts)) {
            if (count > maxVotes) {
                maxVotes = count;
                eliminated = targetId;
            }
        }

        // Beraberlik kontrolü
        const maxVoteTargets = Object.keys(voteCounts).filter(t => voteCounts[t] === maxVotes);
        if (maxVoteTargets.length > 1) {
            eliminated = null;
        }

        // Oyuncuyu ele
        let eliminatedPlayer = null;
        if (eliminated) {
            const player = room.players.get(eliminated);
            if (player) {
                player.isAlive = false;
                room.deadPlayers.add(eliminated);
                eliminatedPlayer = player;
            }
        }

        // Sonucu bildir
        this.io.to(roomCode).emit('vote_result', {
            eliminated: eliminatedPlayer ? {
                id: eliminatedPlayer.id,
                name: eliminatedPlayer.name,
                role: eliminatedPlayer.role,
                voteCount: maxVotes
            } : null,
            tie: maxVoteTargets.length > 1
        });

        // Kazanan kontrolü
        const winner = this.checkWinCondition(roomCode);
        if (winner) {
            this.endGame(roomCode, winner);
            return;
        }

        // Yeni tura geç
        room.round++;

        // Kısa gecikme sonrası gece fazına geç
        setTimeout(() => {
            this.startNightPhase(roomCode);
        }, 3000);
    }

    // Kazanan kontrolü
    checkWinCondition(roomCode) {
        const room = roomManager.getRoom(roomCode);
        if (!room) return null;

        const alivePlayers = Array.from(room.players.values()).filter(p => p.isAlive);
        const aliveVampires = alivePlayers.filter(p => p.role === ROLES.VAMPIR);
        const aliveVillagers = alivePlayers.filter(p => p.role !== ROLES.VAMPIR);

        // Tüm vampirler öldü - köylüler kazandı
        if (aliveVampires.length === 0) {
            return 'villagers';
        }

        // Vampirler eşit veya fazla - vampirler kazandı
        if (aliveVampires.length >= aliveVillagers.length) {
            return 'vampires';
        }

        return null;
    }

    // Oyunu bitir
    endGame(roomCode, winner) {
        const room = roomManager.getRoom(roomCode);
        if (!room) return;

        // Zamanlayıcıyı durdur
        this.stopTimer(roomCode);

        room.phase = PHASES.ENDED;

        // Tüm rolleri açıkla
        const players = Array.from(room.players.values()).map(p => ({
            id: p.id,
            name: p.name,
            role: p.role,
            isAlive: p.isAlive
        }));

        this.io.to(roomCode).emit('game_ended', {
            winner,
            players
        });
    }

    // Oyun durumunu yayınla
    broadcastGameState(roomCode) {
        const room = roomManager.getRoom(roomCode);
        if (!room) return;

        const players = Array.from(room.players.values()).map(p => ({
            id: p.id,
            name: p.name,
            isAlive: p.isAlive,
            isHost: p.isHost
        }));

        this.io.to(roomCode).emit('game_state', {
            phase: room.phase,
            round: room.round,
            players,
            alivePlayers: players.filter(p => p.isAlive).length
        });
    }

    // Oy durumunu yayınla
    broadcastVoteStatus(roomCode) {
        const room = roomManager.getRoom(roomCode);
        if (!room) return;

        const aliveCount = Array.from(room.players.values()).filter(p => p.isAlive).length;
        const votedCount = room.votes.size;

        // Kimin kime oy verdiğini göster
        const votes = {};
        for (const [voterId, targetId] of room.votes) {
            const voter = room.players.get(voterId);
            const target = room.players.get(targetId);
            if (voter && target) {
                votes[voter.name] = target.name;
            }
        }

        this.io.to(roomCode).emit('vote_status', {
            votedCount,
            totalAlive: aliveCount,
            votes
        });
    }

    // Zamanlayıcı başlat
    startTimer(roomCode, seconds, callback) {
        // Önceki zamanlayıcıyı temizle
        this.stopTimer(roomCode);

        let remaining = seconds;

        const timer = setInterval(() => {
            remaining--;

            this.io.to(roomCode).emit('timer_update', {
                remaining,
                total: seconds
            });

            if (remaining <= 0) {
                this.stopTimer(roomCode);
                callback();
            }
        }, 1000);

        this.timers.set(roomCode, timer);

        // İlk durumu gönder
        this.io.to(roomCode).emit('timer_update', {
            remaining: seconds,
            total: seconds
        });
    }

    // Zamanlayıcıyı durdur
    stopTimer(roomCode) {
        const timer = this.timers.get(roomCode);
        if (timer) {
            clearInterval(timer);
            this.timers.delete(roomCode);
        }
    }

    // Chat mesajı gönder
    sendChatMessage(roomCode, playerId, message) {
        const room = roomManager.getRoom(roomCode);
        if (!room) return { success: false };

        const player = room.players.get(playerId);
        if (!player) return { success: false };

        // Gece fazında sadece ölüler ve vampirler (kendi aralarında) chat yapabilir
        if (room.phase === PHASES.NIGHT) {
            if (player.isAlive && player.role !== ROLES.VAMPIR) {
                return { success: false, error: 'Gece boyunca konuşamazsın!' };
            }
        }

        const chatMessage = {
            id: Date.now(),
            playerId,
            playerName: player.name,
            message,
            timestamp: Date.now(),
            isDead: !player.isAlive,
            isVampir: player.role === ROLES.VAMPIR
        };

        room.chat.push(chatMessage);

        // Mesajı uygun oyunculara gönder
        if (!player.isAlive) {
            // Ölü mesajları sadece ölülere
            for (const [id, p] of room.players) {
                if (!p.isAlive) {
                    this.io.to(id).emit('chat_message', { ...chatMessage, type: 'dead' });
                }
            }
        } else if (room.phase === PHASES.NIGHT && player.role === ROLES.VAMPIR) {
            // Vampir gece mesajları sadece vampirlere
            for (const [id, p] of room.players) {
                if (p.role === ROLES.VAMPIR) {
                    this.io.to(id).emit('chat_message', { ...chatMessage, type: 'vampir' });
                }
            }
        } else {
            // Normal mesajlar herkese
            this.io.to(roomCode).emit('chat_message', { ...chatMessage, type: 'public' });
        }

        return { success: true };
    }
}

module.exports = new GameManager();
