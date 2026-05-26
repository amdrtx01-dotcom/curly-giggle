/* Level Definitions */

const LEVELS = [
    {
        id: 1,
        name: 'Тренировка',
        description: 'Уничтожь все мишени',
        world: 'city',
        timeLimit: 120,
        targets: [
            { x: 50, y: 0, z: -50, type: 'static', health: 20 },
            { x: -40, y: 0, z: -80, type: 'static', health: 20 },
            { x: 80, y: 0, z: 30, type: 'static', health: 20 },
            { x: -60, y: 0, z: 60, type: 'static', health: 20 },
            { x: 30, y: 0, z: 100, type: 'static', health: 20 }
        ],
        starThresholds: { time: [90, 60, 30], score: [300, 400, 500] }
    },
    {
        id: 2,
        name: 'Конвой',
        description: 'Останови вражеский конвой',
        world: 'desert',
        timeLimit: 180,
        targets: [
            { x: 30, y: 0, z: -40, type: 'vehicle', health: 40 },
            { x: -50, y: 0, z: -100, type: 'vehicle', health: 40 },
            { x: 60, y: 0, z: 50, type: 'vehicle', health: 40 },
            { x: -80, y: 0, z: 80, type: 'static', health: 25 },
            { x: 0, y: 0, z: -150, type: 'static', health: 25 },
            { x: 100, y: 0, z: -60, type: 'vehicle', health: 40 },
            { x: -30, y: 0, z: 120, type: 'static', health: 25 }
        ],
        starThresholds: { time: [150, 100, 60], score: [800, 1100, 1400] }
    },
    {
        id: 3,
        name: 'Оборона',
        description: 'Уничтожь турели и технику',
        world: 'military',
        timeLimit: 240,
        targets: [
            { x: 60, y: 0, z: 60, type: 'turret', health: 50 },
            { x: -70, y: 0, z: 50, type: 'turret', health: 50 },
            { x: 40, y: 0, z: -80, type: 'vehicle', health: 40 },
            { x: -50, y: 0, z: -90, type: 'vehicle', health: 40 },
            { x: 0, y: 0, z: 100, type: 'turret', health: 50 },
            { x: 100, y: 0, z: 0, type: 'radar', health: 60 },
            { x: -100, y: 0, z: -50, type: 'fuel', health: 45 },
            { x: 80, y: 0, z: -100, type: 'static', health: 30 }
        ],
        starThresholds: { time: [200, 140, 80], score: [1500, 2000, 2500] }
    },
    {
        id: 4,
        name: 'Воздушный бой',
        description: 'Сбей вражеские дроны',
        world: 'ocean',
        timeLimit: 200,
        targets: [
            { x: 50, y: 20, z: -50, type: 'drone', health: 25 },
            { x: -80, y: 25, z: -30, type: 'drone', health: 25 },
            { x: 30, y: 15, z: 80, type: 'drone', health: 25 },
            { x: -40, y: 30, z: 60, type: 'drone', health: 25 },
            { x: 100, y: 20, z: 20, type: 'drone', health: 25 },
            { x: -60, y: 22, z: -80, type: 'drone', health: 25 },
            { x: 0, y: 18, z: -120, type: 'drone', health: 25 },
            { x: 70, y: 28, z: -70, type: 'drone', health: 25 }
        ],
        starThresholds: { time: [160, 110, 60], score: [2500, 3200, 4000] }
    },
    {
        id: 5,
        name: 'Полная зачистка',
        description: 'Уничтожь все вражеские объекты',
        world: 'mountain',
        timeLimit: 300,
        targets: [
            { x: 70, y: 0, z: -60, type: 'turret', health: 60 },
            { x: -80, y: 0, z: -40, type: 'turret', health: 60 },
            { x: 50, y: 0, z: 80, type: 'vehicle', health: 50 },
            { x: -60, y: 0, z: 100, type: 'vehicle', health: 50 },
            { x: 0, y: 20, z: -100, type: 'drone', health: 30 },
            { x: 100, y: 25, z: 0, type: 'drone', health: 30 },
            { x: -100, y: 0, z: -80, type: 'radar', health: 70 },
            { x: 80, y: 0, z: -120, type: 'fuel', health: 55 },
            { x: -40, y: 15, z: -60, type: 'drone', health: 30 },
            { x: 120, y: 0, z: 60, type: 'turret', health: 60 },
            { x: -120, y: 0, z: 40, type: 'fuel', health: 55 },
            { x: 0, y: 0, z: 150, type: 'vehicle', health: 50 }
        ],
        starThresholds: { time: [250, 180, 100], score: [3500, 4500, 5500] }
    },
    {
        id: 6,
        name: 'Ночной рейд',
        description: 'Тайная операция в городе',
        world: 'city',
        timeLimit: 240,
        targets: [
            { x: 40, y: 0, z: -40, type: 'radar', health: 65 },
            { x: -60, y: 0, z: -70, type: 'turret', health: 55 },
            { x: 80, y: 0, z: 50, type: 'fuel', health: 50 },
            { x: -30, y: 20, z: 30, type: 'drone', health: 30 },
            { x: 100, y: 0, z: -90, type: 'vehicle', health: 45 },
            { x: -100, y: 25, z: 0, type: 'drone', health: 30 },
            { x: 50, y: 0, z: 120, type: 'turret', health: 55 },
            { x: -80, y: 0, z: 80, type: 'vehicle', health: 45 },
            { x: 0, y: 0, z: -130, type: 'radar', health: 65 }
        ],
        starThresholds: { time: [200, 140, 80], score: [2800, 3600, 4500] }
    }
];

class LevelManager {
    constructor() {
        this.currentLevel = null;
        this.unlockedLevels = this.loadProgress();
        this.levelStars = this.loadStars();
    }

    getLevel(id) {
        return LEVELS.find(l => l.id === id);
    }

    getAllLevels() {
        return LEVELS;
    }

    isUnlocked(id) {
        return id <= this.unlockedLevels;
    }

    unlockNext(currentId) {
        if (currentId >= this.unlockedLevels) {
            this.unlockedLevels = currentId + 1;
            this.saveProgress();
        }
    }

    calculateStars(levelId, score, timeLeft) {
        const level = this.getLevel(levelId);
        if (!level) return 0;

        let stars = 1;
        if (score >= level.starThresholds.score[1]) stars = 2;
        if (score >= level.starThresholds.score[2] && timeLeft > level.starThresholds.time[2]) stars = 3;

        if (!this.levelStars[levelId] || this.levelStars[levelId] < stars) {
            this.levelStars[levelId] = stars;
            this.saveStars();
        }

        return stars;
    }

    getStars(levelId) {
        return this.levelStars[levelId] || 0;
    }

    loadProgress() {
        try {
            const saved = localStorage.getItem('droneStrike_unlockedLevels');
            return saved ? parseInt(saved) : 1;
        } catch (e) {
            return 1;
        }
    }

    saveProgress() {
        try {
            localStorage.setItem('droneStrike_unlockedLevels', this.unlockedLevels.toString());
        } catch (e) {
            // Storage unavailable
        }
    }

    loadStars() {
        try {
            const saved = localStorage.getItem('droneStrike_levelStars');
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            return {};
        }
    }

    saveStars() {
        try {
            localStorage.setItem('droneStrike_levelStars', JSON.stringify(this.levelStars));
        } catch (e) {
            // Storage unavailable
        }
    }
}
