export type SoundType = 'coin' | 'notification' | 'success' | 'arcade' | 'none';

export const SOUND_NAMES: Record<SoundType, string> = {
    'coin': 'Mario Coin (Classique)',
    'notification': 'Ping Moderne',
    'success': 'Succès / Validation',
    'arcade': 'Arcade Bonus',
    'none': 'Aucun son'
};

const STORAGE_KEY = 'onesms_sound_pref';

// Create synthetic sounds using Web Audio API (no external dependencies!)
function playSyntheticSound(type: SoundType) {
    if (typeof window === 'undefined' || !window.AudioContext) return;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const masterGain = audioContext.createGain();
    masterGain.connect(audioContext.destination);
    masterGain.gain.value = 0.25; // Master volume

    switch (type) {
        case 'coin': {
            // Mario-style coin (E5 -> B5)
            [659.25, 783.99].forEach((freq, i) => {
                const oscillator = audioContext.createOscillator();
                const gain = audioContext.createGain();

                oscillator.connect(gain);
                gain.connect(masterGain);

                oscillator.frequency.value = freq;
                oscillator.type = 'square';

                const startTime = audioContext.currentTime + i * 0.075;
                const endTime = startTime + 0.1;

                gain.gain.setValueAtTime(0.8, startTime);
                gain.gain.exponentialRampToValueAtTime(0.01, endTime);

                oscillator.start(startTime);
                oscillator.stop(endTime);
            });
            break;
        }
        case 'notification': {
            // Soft notification bell (C6 with fade)
            const oscillator = audioContext.createOscillator();
            const gain = audioContext.createGain();

            oscillator.connect(gain);
            gain.connect(masterGain);

            oscillator.frequency.value = 1046.5; // C6
            oscillator.type = 'sine';

            gain.gain.setValueAtTime(0.6, audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.5);
            break;
        }
        case 'success': {
            // Triumphant success (C-E-G major chord arpeggio)
            [523.25, 659.25, 783.99].forEach((freq, i) => {
                const oscillator = audioContext.createOscillator();
                const gain = audioContext.createGain();

                oscillator.connect(gain);
                gain.connect(masterGain);

                oscillator.frequency.value = freq;
                oscillator.type = 'triangle';

                const startTime = audioContext.currentTime + i * 0.12;
                const endTime = startTime + 0.3;

                gain.gain.setValueAtTime(0.5, startTime);
                gain.gain.exponentialRampToValueAtTime(0.01, endTime);

                oscillator.start(startTime);
                oscillator.stop(endTime);
            });
            break;
        }
        case 'arcade': {
            // Power-up sound (rising sweep with wobble)
            const oscillator = audioContext.createOscillator();
            const gain = audioContext.createGain();

            oscillator.connect(gain);
            gain.connect(masterGain);

            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.4);

            gain.gain.setValueAtTime(0.5, audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);

            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.4);
            break;
        }
    }

    // Cleanup
    setTimeout(() => audioContext.close(), 1000);
}

export const SoundManager = {
    play(type?: SoundType) {
        // 1. Déterminer quel son jouer (paramètre ou préférence)
        const soundToPlay = type || this.getPreferredSound();

        if (soundToPlay === 'none') return;

        try {
            playSyntheticSound(soundToPlay);
        } catch (e) {
            console.error('❌ [SoundManager] Error:', e);
        }
    },

    getPreferredSound(): SoundType {
        if (typeof window === 'undefined') return 'coin';
        return (localStorage.getItem(STORAGE_KEY) as SoundType) || 'coin';
    },

    setPreferredSound(type: SoundType) {
        if (typeof window === 'undefined') return;
        localStorage.setItem(STORAGE_KEY, type);
    }
};
