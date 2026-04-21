import { useRef, useCallback } from "react";

/**
 * useSosAudio — генерирует успокаивающий ambient-звук через Web Audio API.
 * Не требует внешних файлов. Работает в Telegram Mini App (iOS/Android).
 *
 * Звуковая модель:
 *  - Низкий дрон-тон 40 Hz (суббас, ощущение "земли")
 *  - Мягкий тон 174 Hz (частота Солфеджио "снятие боли и стресса")
 *  - Пульсирующий тон 285 Hz (ощущение безопасности)
 *  - Белый шум с низким gain (фоновый шум моря)
 * Все тоны имеют плавный fade-in при старте и fade-out при стопе.
 */
export function useSosAudio() {
  const ctxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const nodesRef = useRef<AudioNode[]>([]);

  /** Создаёт осциллятор с заданными параметрами */
  const createOscillator = (
    ctx: AudioContext,
    dest: AudioNode,
    frequency: number,
    type: OscillatorType,
    gainValue: number,
    lfoFreq?: number
  ): OscillatorNode => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(gainValue, ctx.currentTime + 3);

    // LFO — плавная пульсация амплитуды для "живого" звука
    if (lfoFreq) {
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.setValueAtTime(lfoFreq, ctx.currentTime);
      lfo.type = "sine";
      lfoGain.gain.setValueAtTime(gainValue * 0.3, ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      lfo.start();
      nodesRef.current.push(lfo);
    }

    osc.connect(gain);
    gain.connect(dest);
    osc.start();
    nodesRef.current.push(osc, gain);
    return osc;
  };

  /** Создаёт розовый шум (имитация звука океана/дождя) */
  const createPinkNoise = (ctx: AudioContext, dest: AudioNode, gainValue: number) => {
    const bufferSize = ctx.sampleRate * 4; // 4 секунды буфер
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Pink noise через алгоритм Voss-McCartney
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }

    // Зацикливаем буфер
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    // Фильтр нижних частот (эффект «моря»)
    const lpf = ctx.createBiquadFilter();
    lpf.type = "lowpass";
    lpf.frequency.setValueAtTime(800, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(gainValue, ctx.currentTime + 4);

    source.connect(lpf);
    lpf.connect(gain);
    gain.connect(dest);
    source.start();
    nodesRef.current.push(source, lpf, gain);
  };

  /** Запускает SOS-музыку */
  const start = useCallback(() => {
    try {
      // Прекращаем предыдущий сеанс если есть
      if (ctxRef.current) {
        ctxRef.current.close().catch(() => {});
      }

      const ctx = new (window.AudioContext || window.webkitAudioContext!)();
      ctxRef.current = ctx;
      nodesRef.current = [];

      const master = ctx.createGain();
      master.gain.setValueAtTime(1, ctx.currentTime);
      master.connect(ctx.destination);
      masterGainRef.current = master;

      // Компрессор для защиты от клиппинга
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-18, ctx.currentTime);
      compressor.knee.setValueAtTime(10, ctx.currentTime);
      compressor.ratio.setValueAtTime(4, ctx.currentTime);
      compressor.attack.setValueAtTime(0.003, ctx.currentTime);
      compressor.release.setValueAtTime(0.25, ctx.currentTime);
      compressor.connect(master);

      // Дрон-тон 40 Hz — ощущение заземления
      createOscillator(ctx, compressor, 40, "sine", 0.15, 0.05);

      // 174 Hz — базовая нота "снятия тревоги"
      createOscillator(ctx, compressor, 174, "sine", 0.08, 0.07);

      // 285 Hz — нота "безопасности"
      createOscillator(ctx, compressor, 285, "sine", 0.06, 0.12);

      // Небольшой детюн для "хорусного" объема
      createOscillator(ctx, compressor, 286.5, "sine", 0.04);

      // Розовый шум (звук моря)
      createPinkNoise(ctx, compressor, 0.08);

    } catch (err) {
      // Web Audio API может быть недоступен в некоторых контекстах — игнорируем
      console.warn("[SosAudio] Web Audio API unavailable:", err);
    }
  }, []);

  /** Плавно останавливает музыку (fade out 2 секунды) */
  const stop = useCallback(() => {
    const ctx = ctxRef.current;
    const master = masterGainRef.current;
    if (!ctx || !master) return;

    try {
      const fadeOutTime = 2.0;
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + fadeOutTime);

      // Закрываем контекст после fade out
      setTimeout(() => {
        ctx.close().catch(() => {});
        ctxRef.current = null;
        masterGainRef.current = null;
        nodesRef.current = [];
      }, (fadeOutTime + 0.1) * 1000);
    } catch (err) {
      console.warn("[SosAudio] stop error:", err);
    }
  }, []);

  return { start, stop };
}
