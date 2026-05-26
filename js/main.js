/* Application Entry Point */

(function() {
    'use strict';

    // Wait for DOM
    document.addEventListener('DOMContentLoaded', function() {
        // Create game instance
        const game = new Game();
        game.init();

        // Create menu
        const menu = new Menu(game);

        // Show menu
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById('menu-screen').classList.add('active');

        // Prevent context menu on right click
        document.addEventListener('contextmenu', function(e) {
            e.preventDefault();
        });

        console.log('DroneStrike initialized successfully');
    });
})();
