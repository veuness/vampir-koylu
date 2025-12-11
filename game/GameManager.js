const { PHASES, ROLES, DEFAULT_TIMERS, ROLE_DESCRIPTIONS } = require('./constants');
const roomManager = require('./RoomManager');

class GameManager {
    constructor(io) {
        this.io = io;
        this.timers = new Map();
    }

    setIO(io) {
        this.io = io;
    }

    startGame(roomCode) {
        const room = roomManager.getRoom(roomCode);
        if (!room) return { success: false, error: 'Oda bulunamadı!' };

        const roleResult = roomManager.assignRoles(roomCode);
        if (!roleResult.success) return roleResult;

        // Özel rol takipleri
        room.graveRobberTargets = new Map();
        room.medyumUsed = new Map(); // medyumId -> true (yeteneğini kullandı mı)
        room.intikamciTarget = new Map(); // intikamciId -> targetId (bu gece işaretlediği)

        room.phase = PHASES.ROLE_REVEAL;
        room.round = 1;

        this.broadcastRoles(roomCode);

        this.startTimer(roomCode, DEFAULT_TIMERS.ROLE_REVEAL, () => {
            this.startNightPhase(roomCode);
        });

        return { success: true };
    }

    broadcastRoles(roomCode) {
        const room = roomManager.getRoom(roomCode);
        if (!room) return;

        for (const [playerId, player] of room.players) {
            const roleInfo = ROLE_DESCRIPTIONS[player.role];

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

        this.broadcastGameState(roomCode);
    }

    startNightPhase(roomCode) {
        const room = roomManager.getRoom(roomCode);
        if (!room) return;

        room.phase = PHASES.NIGHT;
        room.nightActions = {
            vampirTarget: null,
            doktorTarget: null,
            gozcuResults: new Map(),
            vampirVotes: new Map(),
            eskortVisit: new Map(),
            mezarHirsizi: new Map(),
            medyumRevive: null, // medyumId ve targetId
            intikamciMark: new Map() // intikamciId -> targetId
        };

        this.broadcastGameState(roomCode);

        this.startTimer(roomCode, DEFAULT_TIMERS.NIGHT, () => {
            this.processNightActions(roomCode);
        });
    }

    processNightAction(roomCode, playerId, targetId, actionType) {
        const room = roomManager.getRoom(roomCode);
        if (!room || room.phase !== PHASES.NIGHT) return { success: false };

        const player = room.players.get(playerId);
        if (!player || !player.isAlive) return { success: false };

        // Vampir saldırısı
        if (actionType === 'vampir_kill' && player.role === ROLES.VAMPIR) {
            room.nightActions.vampirVotes.set(playerId, targetId);

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

                this.io.to(playerId).emit('gozcu_result', {
                    targetName: targetPlayer.name,
                    isVampir
                });
            }
            return { success: true };
        }

        // Eskort ziyaret
        if (actionType === 'eskort_visit' && player.role === ROLES.ESKORT) {
            room.nightActions.eskortVisit.set(playerId, targetId);
            return { success: true };
        }

        // Mezar Hırsızı hedef seçimi (sadece ilk gece)
        if (actionType === 'mezar_hirsizi_target' && player.role === ROLES.MEZAR_HIRSIZI) {
            if (room.round === 1 && !room.graveRobberTargets.has(playerId)) {
                room.graveRobberTargets.set(playerId, targetId);
                const targetPlayer = room.players.get(targetId);

                this.io.to(playerId).emit('mezar_hirsizi_locked', {
                    targetName: targetPlayer?.name,
                    message: `Hedefin kilitlendi: ${targetPlayer?.name}. Öldüğünde rolünü devralacaksın!`
                });

                return { success: true };
            }
            return { success: false, error: 'Sadece ilk gece hedef seçebilirsin!' };
        }

        // Medyum canlandırma (tek kullanımlık)
        if (actionType === 'medyum_revive' && player.role === ROLES.MEDYUM) {
            // Daha önce kullandıysa izin verme
            if (room.medyumUsed.get(playerId)) {
                return { success: false, error: 'Canlandırma yeteneğini zaten kullandın!' };
            }

            const targetPlayer = room.players.get(targetId);
            if (!targetPlayer || targetPlayer.isAlive) {
                return { success: false, error: 'Sadece ölü oyuncuları canlandırabilirsin!' };
            }

            room.nightActions.medyumRevive = { medyumId: playerId, targetId };
            return { success: true };
        }

        // İntikamcı işaretleme
        if (actionType === 'intikamci_mark' && player.role === ROLES.INTIKAMCI) {
            const targetPlayer = room.players.get(targetId);
            if (!targetPlayer || !targetPlayer.isAlive) {
                return { success: false, error: 'Sadece hayattaki oyuncuları işaretleyebilirsin!' };
            }

            room.nightActions.intikamciMark.set(playerId, targetId);
            room.intikamciTarget.set(playerId, targetId);
            return { success: true };
        }

        return { success: false };
    }

    // Mezar Hırsızı dönüşüm kontrolü
    checkGraveRobberTransformation(roomCode, deadPlayerId) {
        const room = roomManager.getRoom(roomCode);
        if (!room) return;

        const deadPlayer = room.players.get(deadPlayerId);
        if (!deadPlayer) return;

        for (const [graveRobberId, targetId] of room.graveRobberTargets) {
            if (targetId === deadPlayerId) {
                const graveRobber = room.players.get(graveRobberId);
                if (graveRobber && graveRobber.isAlive) {
                    const oldRole = deadPlayer.role;
                    const roleInfo = ROLE_DESCRIPTIONS[oldRole];

                    graveRobber.role = oldRole;

                    this.io.to(graveRobberId).emit('grave_robber_transform', {
                        newRole: oldRole,
                        roleInfo: roleInfo,
                        message: `Hedefin ${deadPlayer.name} öldü! Artık sen yeni ${roleInfo?.name || oldRole} oldun!`
                    });

                    if (oldRole === ROLES.VAMPIR) {
                        const vampires = [];
                        for (const [id, p] of room.players) {
                            if (p.role === ROLES.VAMPIR && p.isAlive && id !== graveRobberId) {
                                vampires.push(p.name);
                            }
                        }
                        this.io.to(graveRobberId).emit('role_assigned', {
                            role: ROLES.VAMPIR,
                            roleInfo: ROLE_DESCRIPTIONS[ROLES.VAMPIR],
                            teammates: vampires
                        });
                    }
                }
            }
        }
    }

    // İntikamcı ölüm kontrolü - ölürse işaretlediğini de öldür
    checkAvengerRevenge(roomCode, deadPlayerId, killedPlayers) {
        const room = roomManager.getRoom(roomCode);
        if (!room) return;

        // Bu gece işaretleme var mı kontrol et
        for (const [intikamciId, markedId] of room.intikamciTarget) {
            if (intikamciId === deadPlayerId) {
                // İntikamcı öldü, işaretlediği kişiyi de öldür
                const markedPlayer = room.players.get(markedId);
                if (markedPlayer && markedPlayer.isAlive) {
                    markedPlayer.isAlive = false;
                    room.deadPlayers.add(markedId);
                    killedPlayers.push({
                        id: markedPlayer.id,
                        name: markedPlayer.name,
                        reason: 'intikamci_gazabi'
                    });

                    // İşaretlenen için de Mezar Hırsızı kontrolü
                    this.checkGraveRobberTransformation(roomCode, markedId);

                    // Herkese bildir
                    this.io.to(roomCode).emit('avenger_revenge', {
                        avengerName: room.players.get(intikamciId)?.name,
                        victimName: markedPlayer.name,
                        message: `⚔️ ${room.players.get(intikamciId)?.name}'ın gazabı! ${markedPlayer.name} de öldü!`
                    });
                }
            }
        }
    }

    processNightActions(roomCode) {
        const room = roomManager.getRoom(roomCode);
        if (!room) return;

        const killedPlayers = [];
        const vampirTarget = room.nightActions.vampirTarget;
        const doktorTarget = room.nightActions.doktorTarget;
        const eskortVisits = room.nightActions.eskortVisit;

        // Medyum canlandırma işlemi (ölüm işlemlerinden ÖNCE)
        if (room.nightActions.medyumRevive) {
            const { medyumId, targetId } = room.nightActions.medyumRevive;
            const targetPlayer = room.players.get(targetId);
            const medyum = room.players.get(medyumId);

            if (targetPlayer && !targetPlayer.isAlive && medyum && medyum.isAlive) {
                // Canlandır
                targetPlayer.isAlive = true;
                room.deadPlayers.delete(targetId);
                room.medyumUsed.set(medyumId, true);

                // Herkese bildir
                this.io.to(roomCode).emit('player_revived', {
                    revivedName: targetPlayer.name,
                    message: `🔯 Bir mucize oldu! ${targetPlayer.name} hayata döndü!`
                });

                // Medyum'a özel bildirim
                this.io.to(medyumId).emit('medyum_success', {
                    message: `${targetPlayer.name} başarıyla canlandırıldı! Artık bu yeteneği tekrar kullanamazsın.`
                });
            }
        }

        // Ana hedef işleme
        if (vampirTarget) {
            const target = room.players.get(vampirTarget);

            if (target && target.isAlive) {
                const isProtected = vampirTarget === doktorTarget;

                if (!isProtected) {
                    target.isAlive = false;
                    room.deadPlayers.add(vampirTarget);
                    killedPlayers.push({ id: target.id, name: target.name, reason: 'vampir' });

                    // İntikamcı kontrolü - eğer ölen İntikamcı ise
                    this.checkAvengerRevenge(roomCode, vampirTarget, killedPlayers);

                    // Mezar Hırsızı dönüşüm kontrolü
                    this.checkGraveRobberTransformation(roomCode, vampirTarget);

                    // Eskort kontrolü
                    for (const [eskortId, visitTarget] of eskortVisits) {
                        if (visitTarget === vampirTarget) {
                            const eskort = room.players.get(eskortId);
                            if (eskort && eskort.isAlive) {
                                eskort.isAlive = false;
                                room.deadPlayers.add(eskortId);
                                killedPlayers.push({ id: eskort.id, name: eskort.name, reason: 'eskort_visit' });

                                // Eskort İntikamcı mı?
                                this.checkAvengerRevenge(roomCode, eskortId, killedPlayers);
                                this.checkGraveRobberTransformation(roomCode, eskortId);
                            }
                        }
                    }
                }
            }
        }

        // Eskort evde mi kontrolü
        for (const [eskortId, visitTarget] of eskortVisits) {
            const eskort = room.players.get(eskortId);
            if (!eskort || !eskort.isAlive) continue;

            if (vampirTarget === eskortId) {
                if (visitTarget === null) {
                    if (eskort.isAlive && doktorTarget !== eskortId) {
                        eskort.isAlive = false;
                        room.deadPlayers.add(eskortId);
                        killedPlayers.push({ id: eskort.id, name: eskort.name, reason: 'vampir' });

                        this.checkAvengerRevenge(roomCode, eskortId, killedPlayers);
                        this.checkGraveRobberTransformation(roomCode, eskortId);
                    }
                } else {
                    this.io.to(eskortId).emit('eskort_escaped', {
                        message: 'Vampirler evine saldırdı ama sen dışarıdaydın! Kurtuldun!'
                    });
                }
            }
        }

        // Gece sonucunu bildir
        this.io.to(roomCode).emit('night_result', {
            killed: killedPlayers.length > 0 ? killedPlayers : null,
            saved: vampirTarget === doktorTarget && vampirTarget ? true : false,
            multipleDeaths: killedPlayers.length > 1
        });

        // Kazanan kontrolü
        const winner = this.checkWinCondition(roomCode);
        if (winner) {
            this.endGame(roomCode, winner);
            return;
        }

        this.startDayPhase(roomCode);
    }

    startDayPhase(roomCode) {
        const room = roomManager.getRoom(roomCode);
        if (!room) return;

        room.phase = PHASES.DAY;

        this.broadcastGameState(roomCode);

        const dayTime = room.config?.timers?.day || DEFAULT_TIMERS.DAY;

        this.startTimer(roomCode, dayTime, () => {
            this.startVotingPhase(roomCode);
        });
    }

    startVotingPhase(roomCode) {
        const room = roomManager.getRoom(roomCode);
        if (!room) return;

        room.phase = PHASES.VOTING;
        room.votes = new Map();

        this.broadcastGameState(roomCode);

        const votingTime = room.config?.timers?.voting || DEFAULT_TIMERS.VOTING;

        this.startTimer(roomCode, votingTime, () => {
            this.processVotes(roomCode);
        });
    }

    vote(roomCode, voterId, targetId) {
        const room = roomManager.getRoom(roomCode);
        if (!room || room.phase !== PHASES.VOTING) return { success: false };

        const voter = room.players.get(voterId);
        if (!voter || !voter.isAlive) return { success: false };

        if (voterId === targetId) return { success: false, error: 'Kendine oy veremezsin!' };

        const target = room.players.get(targetId);
        if (!target || !target.isAlive) return { success: false };

        room.votes.set(voterId, targetId);

        this.broadcastVoteStatus(roomCode);

        return { success: true };
    }

    processVotes(roomCode) {
        const room = roomManager.getRoom(roomCode);
        if (!room) return;

        const voteCounts = {};
        for (const targetId of room.votes.values()) {
            voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
        }

        let maxVotes = 0;
        let eliminated = null;

        for (const [targetId, count] of Object.entries(voteCounts)) {
            if (count > maxVotes) {
                maxVotes = count;
                eliminated = targetId;
            }
        }

        const maxVoteTargets = Object.keys(voteCounts).filter(t => voteCounts[t] === maxVotes);
        if (maxVoteTargets.length > 1) {
            eliminated = null;
        }

        let eliminatedPlayer = null;

        if (eliminated) {
            const player = room.players.get(eliminated);
            if (player) {
                // JESTER KONTROLÜ
                if (player.role === ROLES.JESTER) {
                    player.isAlive = false;
                    room.deadPlayers.add(eliminated);

                    this.io.to(roomCode).emit('vote_result', {
                        eliminated: {
                            id: player.id,
                            name: player.name,
                            role: player.role,
                            voteCount: maxVotes
                        },
                        tie: false,
                        jesterWin: true
                    });

                    this.endGame(roomCode, 'jester');
                    return;
                }

                // Normal eleme
                player.isAlive = false;
                room.deadPlayers.add(eliminated);
                eliminatedPlayer = player;

                // İntikamcı asıldıysa, işaretlediğini de öldür
                if (player.role === ROLES.INTIKAMCI) {
                    const markedId = room.intikamciTarget.get(eliminated);
                    if (markedId) {
                        const markedPlayer = room.players.get(markedId);
                        if (markedPlayer && markedPlayer.isAlive) {
                            markedPlayer.isAlive = false;
                            room.deadPlayers.add(markedId);

                            this.io.to(roomCode).emit('avenger_revenge', {
                                avengerName: player.name,
                                victimName: markedPlayer.name,
                                message: `⚔️ ${player.name}'ın gazabı! ${markedPlayer.name} de öldü!`
                            });

                            this.checkGraveRobberTransformation(roomCode, markedId);
                        }
                    }
                }

                this.checkGraveRobberTransformation(roomCode, eliminated);
            }
        }

        this.io.to(roomCode).emit('vote_result', {
            eliminated: eliminatedPlayer ? {
                id: eliminatedPlayer.id,
                name: eliminatedPlayer.name,
                role: eliminatedPlayer.role,
                voteCount: maxVotes
            } : null,
            tie: maxVoteTargets.length > 1,
            jesterWin: false
        });

        const winner = this.checkWinCondition(roomCode);
        if (winner) {
            this.endGame(roomCode, winner);
            return;
        }

        room.round++;

        setTimeout(() => {
            this.startNightPhase(roomCode);
        }, 3000);
    }

    checkWinCondition(roomCode) {
        const room = roomManager.getRoom(roomCode);
        if (!room) return null;

        const alivePlayers = Array.from(room.players.values()).filter(p => p.isAlive);
        const aliveVampires = alivePlayers.filter(p => p.role === ROLES.VAMPIR);
        const aliveVillagers = alivePlayers.filter(p =>
            p.role !== ROLES.VAMPIR && p.role !== ROLES.JESTER
        );

        if (aliveVampires.length === 0) {
            return 'villagers';
        }

        if (aliveVampires.length >= aliveVillagers.length) {
            return 'vampires';
        }

        return null;
    }

    endGame(roomCode, winner) {
        const room = roomManager.getRoom(roomCode);
        if (!room) return;

        this.stopTimer(roomCode);

        room.phase = PHASES.ENDED;

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

    broadcastGameState(roomCode) {
        const room = roomManager.getRoom(roomCode);
        if (!room) return;

        const players = Array.from(room.players.values()).map(p => ({
            id: p.id,
            name: p.name,
            isAlive: p.isAlive,
            isHost: p.isHost
        }));

        // Ölü oyuncuları da gönder (Medyum için)
        const deadPlayers = Array.from(room.players.values())
            .filter(p => !p.isAlive)
            .map(p => ({ id: p.id, name: p.name }));

        this.io.to(roomCode).emit('game_state', {
            phase: room.phase,
            round: room.round,
            players,
            deadPlayers,
            alivePlayers: players.filter(p => p.isAlive).length
        });
    }

    broadcastVoteStatus(roomCode) {
        const room = roomManager.getRoom(roomCode);
        if (!room) return;

        const aliveCount = Array.from(room.players.values()).filter(p => p.isAlive).length;
        const votedCount = room.votes.size;

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

    startTimer(roomCode, seconds, callback) {
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

        this.io.to(roomCode).emit('timer_update', {
            remaining: seconds,
            total: seconds
        });
    }

    stopTimer(roomCode) {
        const timer = this.timers.get(roomCode);
        if (timer) {
            clearInterval(timer);
            this.timers.delete(roomCode);
        }
    }

    sendChatMessage(roomCode, playerId, message) {
        const room = roomManager.getRoom(roomCode);
        if (!room) return { success: false };

        const player = room.players.get(playerId);
        if (!player) return { success: false };

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

        if (!player.isAlive) {
            for (const [id, p] of room.players) {
                if (!p.isAlive) {
                    this.io.to(id).emit('chat_message', { ...chatMessage, type: 'dead' });
                }
            }
        } else if (room.phase === PHASES.NIGHT && player.role === ROLES.VAMPIR) {
            for (const [id, p] of room.players) {
                if (p.role === ROLES.VAMPIR) {
                    this.io.to(id).emit('chat_message', { ...chatMessage, type: 'vampir' });
                }
            }
        } else {
            this.io.to(roomCode).emit('chat_message', { ...chatMessage, type: 'public' });
        }

        return { success: true };
    }
}

module.exports = new GameManager();
