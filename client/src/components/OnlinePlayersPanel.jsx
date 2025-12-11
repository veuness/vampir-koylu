function OnlinePlayersPanel({ players, isOpen, onToggle }) {
    return (
        <>
            {/* Toggle Button (mobil için) */}
            <button
                onClick={onToggle}
                className="fixed left-4 top-20 z-40 lg:hidden bg-night-800 border border-vampire-600/50 
                   text-vampire-300 p-2 rounded-lg shadow-lg hover:bg-night-700 transition-all"
            >
                👥 {players.length}
            </button>

            {/* Panel */}
            <div className={`fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-night-900 to-vampire-900/50 
                      border-r border-vampire-700/30 shadow-2xl z-30 transform transition-transform duration-300
                      ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                {/* Header */}
                <div className="p-4 border-b border-vampire-700/30">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-vampire-300 flex items-center gap-2">
                            👥 Online Oyuncular
                        </h3>
                        <span className="bg-vampire-600/50 text-vampire-200 px-2 py-1 rounded-full text-sm font-bold">
                            {players.length}
                        </span>
                    </div>
                </div>

                {/* Player List */}
                <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 80px)' }}>
                    {players.length === 0 ? (
                        <p className="text-gray-500 text-center text-sm">
                            Henüz kimse online değil
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {players.map((player, index) => (
                                <div
                                    key={player.id}
                                    className="flex items-center gap-3 p-2 rounded-lg bg-night-800/50 
                           border border-night-700 hover:border-vampire-600/50 transition-all
                           animate-fadeIn"
                                    style={{ animationDelay: `${index * 30}ms` }}
                                >
                                    {/* Avatar */}
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-vampire-500 to-vampire-700 
                                flex items-center justify-center text-sm font-bold text-white">
                                        {player.name.charAt(0).toUpperCase()}
                                    </div>

                                    {/* Name */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white text-sm font-medium truncate">
                                            {player.name}
                                        </p>
                                    </div>

                                    {/* Online indicator */}
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Close button for mobile */}
                <button
                    onClick={onToggle}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white lg:hidden"
                >
                    ✕
                </button>
            </div>

            {/* Overlay for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-20 lg:hidden"
                    onClick={onToggle}
                />
            )}
        </>
    );
}

export default OnlinePlayersPanel;
