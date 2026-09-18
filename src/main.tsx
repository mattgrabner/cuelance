import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowLeft, ArrowRight, Camera, Check, CheckCircle2, Download, FileText, FlipHorizontal2, KeyRound, Maximize2, Minimize2, Moon, Play, Radio, Settings2, ShieldCheck, Square, Sun, Trash2, Type, X } from 'lucide-react';
import './styles.css';
import { Glass } from './Glass';
import { ColorWheel } from './ColorWheel';

const initialScript = `Most good ideas begin as a quiet thought.

For me, it started with a simple question: what would make recording feel more like talking to a person — and less like performing for a machine?

Cuelance keeps your words close to the lens, so you can stay present, natural, and in the moment.

Take a breath. Find your rhythm. The next line will be right here.`;

type SpeechRecognitionLike = { continuous: boolean; interimResults: boolean; lang: string; onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null; onend: (() => void) | null; start: () => void; stop: () => void };
type SpeechWindow = Window & { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
const colors = [{ name: 'Warm white', value: '#f3f2e9' }, { name: 'Lime', value: '#c8ef79' }, { name: 'Soft blue', value: '#a8d8ff' }, { name: 'Amber', value: '#ffd27d' }];

function savedAccent() {
  const value = document.cookie.split('; ').find((entry) => entry.startsWith('cuelance-accent='))?.split('=')[1];
  try {
    const decoded = decodeURIComponent(value || '');
    return /^#[0-9a-f]{6}$/i.test(decoded) ? decoded : '#e96543';
  } catch { return '#e96543'; }
}

function App() {
  const [accent, setAccent] = useState(savedAccent);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const paletteRef = useRef<HTMLDivElement>(null);
  const paletteTrigger = useRef<HTMLButtonElement>(null);
  const chooseAccent = (value: string) => {
    setAccent(value);
    document.cookie = `cuelance-accent=${encodeURIComponent(value)}; Max-Age=31536000; Path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
  };
  useEffect(() => {
    if (!paletteOpen) return;
    const outside = (event: PointerEvent) => { if (!paletteRef.current?.contains(event.target as Node)) setPaletteOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setPaletteOpen(false); paletteTrigger.current?.focus(); } };
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [paletteOpen]);
  const [script, setScript] = useState(() => localStorage.getItem('cuelance-script') ?? initialScript);
  const [openAiKey, setOpenAiKey] = useState(() => localStorage.getItem('cuelance-openai-key') ?? '');
  const [isSetupOpen, setSetupOpen] = useState(false);
  const [isRecording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [activeSentence, setActiveSentence] = useState(0);
  const [highlightWord, setHighlightWord] = useState(-1);
  const [cameraReady, setCameraReady] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showStylePanel, setShowStylePanel] = useState(false);
  const [mirror, setMirror] = useState(true);
  const [fontSize, setFontSize] = useState(26);
  const [fontFamily, setFontFamily] = useState('DM Sans');
  const [promptColor, setPromptColor] = useState('#f3f2e9');
  const [theme, setTheme] = useState<'bright' | 'dark'>(() => (localStorage.getItem('cuelance-theme') as 'bright' | 'dark') || 'bright');
  const [isFullscreen, setFullscreen] = useState(false);
  const [viewportFullscreen, setViewportFullscreen] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [speechLive, setSpeechLive] = useState(false);
  const [mediaError, setMediaError] = useState('');
  const [recordedUrl, setRecordedUrl] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraFrameRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const fallbackTimerRef = useRef<number | null>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const parsedSentences = useMemo(() => script.split(/(?<=[.!?])\s+/).filter(Boolean), [script]);
  const currentSentence = parsedSentences[activeSentence] || parsedSentences[0] || 'Start typing your script…';
  const currentWords = useMemo(() => currentSentence.split(/(\s+)/), [currentSentence]);
  const wordCount = script.trim() ? script.trim().split(/\s+/).length : 0;
  const downloadName = recordedUrl && recorderRef.current?.mimeType.includes('mp4') ? 'cuelance-take.mp4' : 'cuelance-take.webm';
  const time = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;
  const speechSupported = typeof window !== 'undefined' && Boolean((window as SpeechWindow).SpeechRecognition || (window as SpeechWindow).webkitSpeechRecognition);

  useEffect(() => { localStorage.setItem('cuelance-script', script); }, [script]);
  useEffect(() => { if (openAiKey) localStorage.setItem('cuelance-openai-key', openAiKey); else localStorage.removeItem('cuelance-openai-key'); }, [openAiKey]);
  useEffect(() => { localStorage.setItem('cuelance-theme', theme); }, [theme]);
  useEffect(() => { if (!isRecording) return; const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000); return () => window.clearInterval(timer); }, [isRecording]);
  useEffect(() => { const onFullscreen = () => { setFullscreen(document.fullscreenElement === cameraFrameRef.current); if (document.fullscreenElement) setViewportFullscreen(false); }; document.addEventListener('fullscreenchange', onFullscreen); return () => document.removeEventListener('fullscreenchange', onFullscreen); }, []);
  useEffect(() => { const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && viewportFullscreen) { setViewportFullscreen(false); setFullscreen(false); } }; document.addEventListener('keydown', onKey); return () => document.removeEventListener('keydown', onKey); }, [viewportFullscreen]);
  useEffect(() => () => { streamRef.current?.getTracks().forEach((track) => track.stop()); recognitionRef.current?.stop(); if (fallbackTimerRef.current) window.clearInterval(fallbackTimerRef.current); if (countdownTimerRef.current) window.clearInterval(countdownTimerRef.current); }, []);
  useEffect(() => {
    if (!isSetupOpen && !showPreview) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setSetupOpen(false); setShowPreview(false); }
      if (event.key !== 'Tab') return;
      const dialog = document.querySelector('[role="dialog"]'); const items = dialog?.querySelectorAll<HTMLElement>('button, a[href], input, select, video[controls]'); if (!items?.length) return;
      const first = items[0], last = items[items.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey); return () => document.removeEventListener('keydown', onKey);
  }, [isSetupOpen, showPreview]);

  const secureCameraContext = typeof window !== 'undefined' && (window.isSecureContext || ['localhost', '127.0.0.1'].includes(window.location.hostname));
  const requestCamera = async () => { try { setMediaError(''); if (!secureCameraContext) { setMediaError('iPhone camera access needs HTTPS. Open the HTTPS tunnel URL, not the local Wi-Fi http:// address.'); return; } if (!navigator.mediaDevices?.getUserMedia) { setMediaError('This browser does not expose camera access here. Open Cuelance in Safari over HTTPS.'); return; } if (streamRef.current) return; const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }); streamRef.current = stream; if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); } setCameraReady(true); } catch (error) { const name = error instanceof DOMException ? error.name : ''; setMediaError(name === 'NotAllowedError' ? 'Camera permission was blocked. Allow Camera and Microphone for this site in iPhone Settings, then reload.' : 'Camera access is unavailable. Check browser permissions and try again.'); } };
  const matchSpeechToScript = (spoken: string) => { const lastSpoken = spoken.toLowerCase().replace(/[^a-z0-9äöüß]+/gi, ' ').trim().split(/\s+/).filter(Boolean).at(-1); if (!lastSpoken) return; const matchIndex = currentWords.findIndex((word) => word.toLowerCase().replace(/[^a-z0-9äöüß]+/gi, '') === lastSpoken); if (matchIndex >= 0) { setHighlightWord(matchIndex); if (matchIndex >= currentWords.length - 2 && activeSentence < parsedSentences.length - 1) window.setTimeout(() => { setActiveSentence((value) => Math.min(value + 1, parsedSentences.length - 1)); setHighlightWord(-1); }, 320); } };
  const startSpeechFollow = () => { const speechWindow = window as SpeechWindow; const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition; if (Recognition) { const recognition = new Recognition(); recognition.continuous = true; recognition.interimResults = true; recognition.lang = 'en-US'; recognition.onresult = (event) => matchSpeechToScript(event.results[event.results.length - 1][0].transcript); recognition.onend = () => { if (isRecording) { try { recognition.start(); } catch { /* browser can reject a quick restart */ } } }; recognitionRef.current = recognition; try { recognition.start(); setSpeechLive(true); } catch { setSpeechLive(false); } } else { setSpeechLive(false); fallbackTimerRef.current = window.setInterval(() => setHighlightWord((value) => value >= currentWords.length - 2 ? 0 : value + 2), 620); } };
  const stopSpeechFollow = () => { recognitionRef.current?.stop(); recognitionRef.current = null; if (fallbackTimerRef.current) window.clearInterval(fallbackTimerRef.current); fallbackTimerRef.current = null; setSpeechLive(false); setHighlightWord(-1); };
  const startRecordingNow = async () => { if (!streamRef.current) await requestCamera(); const stream = streamRef.current; if (!stream) return; const mime = ['video/mp4;codecs=avc1,opus', 'video/webm;codecs=vp9,opus', 'video/webm'].find((type) => MediaRecorder.isTypeSupported(type)); try { chunksRef.current = []; const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined); recorder.ondataavailable = (event) => event.data.size && chunksRef.current.push(event.data); recorder.onstop = () => { const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'video/webm' }); setRecordedUrl(URL.createObjectURL(blob)); setShowPreview(true); }; recorder.start(1000); recorderRef.current = recorder; setElapsed(0); setRecording(true); setShowPreview(false); startSpeechFollow(); } catch { setMediaError('This browser could not start a recording.'); } };
  const toggleRecording = async () => { if (isRecording) { recorderRef.current?.stop(); stopSpeechFollow(); setRecording(false); return; } if (countdown) return; if (!secureCameraContext) { setMediaError('iPhone camera access needs HTTPS. Open the HTTPS tunnel URL, not the local Wi-Fi http:// address.'); return; } setCountdown(3); let remaining = 3; countdownTimerRef.current = window.setInterval(() => { remaining -= 1; if (remaining <= 0) { if (countdownTimerRef.current) window.clearInterval(countdownTimerRef.current); countdownTimerRef.current = null; setCountdown(0); void startRecordingNow(); } else setCountdown(remaining); }, 1000); };
  const toggleFullscreen = async () => { if (!cameraFrameRef.current) return; if (viewportFullscreen) { setViewportFullscreen(false); setFullscreen(false); return; } if (document.fullscreenElement) { await document.exitFullscreen(); return; } try { if (!cameraFrameRef.current.requestFullscreen) throw new Error('fullscreen-not-supported'); await cameraFrameRef.current.requestFullscreen(); } catch { setViewportFullscreen(true); setFullscreen(true); } };
  const shiftSentence = (amount: number) => { setActiveSentence((value) => Math.min(Math.max(value + amount, 0), Math.max(parsedSentences.length - 1, 0))); setHighlightWord(-1); };
  const clearScript = () => { if (window.confirm('Clear this script?')) setScript(''); };

  return <div className={`app-shell ${theme}`} style={{ '--accent': accent } as React.CSSProperties}>
    <div className="app-glass" aria-hidden="true"><Glass color={accent} paused={isRecording} /></div>
    <header className="topbar"><div className="brand"><Radio size={25} strokeWidth={1.8} /><span>cuelance</span></div><div className="top-actions"><span className={openAiKey ? 'key-status ready' : 'key-status'}><KeyRound size={13} /> {openAiKey ? 'OpenAI key ready' : 'OpenAI key missing'}</span><button className="plain-button theme-toggle" aria-label={`Switch to ${theme === 'bright' ? 'dark' : 'bright'} mode`} onClick={() => setTheme((value) => value === 'bright' ? 'dark' : 'bright')}>{theme === 'bright' ? <Moon size={16} /> : <Sun size={16} />} {theme === 'bright' ? 'Dark mode' : 'Bright mode'}</button><button className="plain-button" onClick={() => setSetupOpen(true)}><Settings2 size={16} /> Setup</button><div className={`palette ${paletteOpen ? 'is-open' : ''}`} ref={paletteRef} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setPaletteOpen(false); }}>
        <button ref={paletteTrigger} className="palette-trigger" title="Accent color" aria-label="Change accent color" aria-expanded={paletteOpen} aria-controls="accent-palette" onClick={() => setPaletteOpen(!paletteOpen)}><span className="color-orb" /></button>
        <div id="accent-palette" className="palette-popover" inert={!paletteOpen} aria-hidden={!paletteOpen}>
          <ColorWheel color={accent} onChange={chooseAccent} />
        </div>
      </div></div></header>
    <main className="workspace">
      <aside className="script-panel"><div className="panel-heading"><div><p className="eyebrow">01 / Your script</p><h1>First take<span className="accent-period">.</span></h1></div><FileText size={19} color="#85897c" strokeWidth={1.5} /></div><div className="script-stats"><span>{wordCount} words</span><span>About {Math.ceil(wordCount / 140 * 60)} sec</span></div><div className="script-editor-wrap"><label className="editor-label" htmlFor="script-input">Edit script<span>Type or paste text</span></label><textarea id="script-input" value={script} onChange={(event) => { setScript(event.target.value); setActiveSentence(0); setHighlightWord(-1); }} aria-label="Script editor" placeholder="Paste or type your script…" /><div className="editor-footer"><span><Check size={13} /> Saved on this device</span><button onClick={clearScript}><Trash2 size={13} /> Clear</button></div></div><p className="script-note">The highlighted word follows your voice while you record.</p></aside>
      <section className="stage" aria-label="Recording studio"><div className="stage-toolbar"><div className="status-pill"><span className={isRecording ? 'live-dot' : 'status-dot'} />{isRecording ? 'Recording' : '02 / Recording studio'}</div><div className="toolbar-right"><button className="toolbar-button" aria-label="Mirror camera" aria-pressed={mirror} onClick={() => setMirror(!mirror)}><FlipHorizontal2 size={15} /> Mirror</button><div className="style-control"><button className="toolbar-button" aria-label="Prompt style" aria-expanded={showStylePanel} onClick={() => setShowStylePanel(!showStylePanel)}><Type size={15} /> Prompt style</button>{showStylePanel && <div className="style-popover"><div className="style-popover-title"><span>Prompt style</span><button aria-label="Close prompt style" onClick={() => setShowStylePanel(false)}><X size={14} /></button></div><label className="style-field">Size <span>{fontSize}px</span><input type="range" min="20" max="40" value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))} /></label><label className="style-field">Font<select value={fontFamily} onChange={(event) => setFontFamily(event.target.value)}><option>DM Sans</option><option>Georgia</option><option>Arial</option><option>Space Grotesk</option></select></label><div className="style-field">Color <div className="color-swatches">{colors.map((color) => <button key={color.value} className={promptColor === color.value ? 'color-swatch selected' : 'color-swatch'} aria-label={color.name} style={{ background: color.value }} onClick={() => setPromptColor(color.value)} />)}</div></div></div>}</div><button className="toolbar-button" aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen video'} onClick={toggleFullscreen}>{isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />} {isFullscreen ? 'Exit' : 'Fullscreen'}</button></div></div>
        <div ref={cameraFrameRef} className={`camera-frame ${viewportFullscreen ? 'viewport-fullscreen' : ''}`}><video ref={videoRef} className={mirror ? 'mirrored' : ''} muted playsInline />{isFullscreen && <div className="fullscreen-controls"><div className="fullscreen-group"><button onClick={() => shiftSentence(-1)} disabled={activeSentence === 0} aria-label="Previous cue"><ArrowLeft size={20} /></button><button onClick={() => shiftSentence(1)} disabled={activeSentence >= parsedSentences.length - 1} aria-label="Next cue"><ArrowRight size={20} /></button></div><label className="fullscreen-size-control"><span>Prompt size</span><input aria-label="Fullscreen prompt size" type="range" min="20" max="48" value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))} /><strong>{fontSize}px</strong></label><button className={isRecording ? 'fullscreen-record recording' : 'fullscreen-record'} onClick={toggleRecording}>{isRecording ? <><Square size={17} fill="currentColor" /> Stop</> : <><Radio size={17} /> Record</>}</button><button className="fullscreen-exit" onClick={toggleFullscreen} aria-label="Exit fullscreen"><Minimize2 size={18} /></button></div>}{countdown > 0 && <div className="countdown-overlay" role="status" aria-live="assertive"><span>Recording starts in</span><strong>{countdown}</strong></div>}<div className="teleprompter-overlay" style={{ fontFamily, color: promptColor }}><div className="prompt-copy"><span className="prompt-label">{speechLive ? 'Following your voice' : openAiKey ? 'OpenAI ready · voice follow' : 'Local voice follow'}</span><p key={activeSentence} className="cue-line" style={{ fontSize: `${fontSize}px` }}>{currentWords.map((word, index) => word.trim() ? <React.Fragment key={`${word}-${index}`}><span className={index === highlightWord ? 'spoken-word' : ''}>{word}</span>{' '}</React.Fragment> : word)}</p><div className="next-line">{parsedSentences[activeSentence + 1] || (script.trim() ? 'End of script.' : '')}</div></div></div>{!cameraReady && <div className="camera-placeholder"><Camera size={24} strokeWidth={1.3} /><span>{mediaError ? 'Camera unavailable' : 'Camera preview'}</span><small role={mediaError ? 'alert' : undefined}>{mediaError || (!secureCameraContext ? 'iPhone camera needs HTTPS. Use an https:// tunnel URL.' : 'Your camera preview will appear here.')}</small><button className="preview-action" onClick={requestCamera}>{mediaError ? 'Try camera again' : 'Enable camera'}</button></div>}<div className="frame-bottom"><span>{cameraReady ? 'Camera connected' : 'Camera off'}</span><span>{speechLive ? 'Listening for your voice' : openAiKey ? 'OpenAI key ready' : speechSupported ? 'Browser voice follow' : 'Voice follow demo'}</span></div></div>
        <div className="prompt-controls"><button className="round-control" disabled={activeSentence === 0} onClick={() => shiftSentence(-1)} title="Back one sentence"><ArrowLeft size={18} /></button><div className="position-control"><span>Script position</span><input aria-label="Script position" type="range" min="0" max={Math.max(parsedSentences.length - 1, 0)} value={activeSentence} onChange={(event) => { setActiveSentence(Number(event.target.value)); setHighlightWord(-1); }} /><span>{parsedSentences.length ? activeSentence + 1 : 0} / {parsedSentences.length}</span></div><button className="round-control" disabled={activeSentence >= parsedSentences.length - 1} onClick={() => shiftSentence(1)} title="Forward one sentence"><ArrowRight size={18} /></button></div><div className="record-row"><div><div className="record-time">{time}</div><div className="record-status">{isRecording ? 'Take in progress · word highlighting active' : 'Ready to record'}</div></div><button className={isRecording ? 'record-button recording' : 'record-button'} onClick={toggleRecording}>{isRecording ? <><Square size={16} fill="currentColor" /> Stop recording</> : <><Radio size={17} /> Start recording</>}</button></div>{!openAiKey && <button className="missing-key-banner" onClick={() => setSetupOpen(true)}><KeyRound size={14} /> OpenAI key missing · add one in Setup for OpenAI transcription <ArrowRight size={13} /></button>}{mediaError && cameraReady && <p role="alert">{mediaError}</p>}</section>
    </main>
    <footer className="bottom-bar"><div className="footer-imprint">made with 💛 in Vienna · by Matthias Grabner · <a href="mailto:hello@grabner.tech">hello@grabner.tech</a> · <a href="https://github.com/mattgrabner/cuelance" target="_blank" rel="noreferrer">GitHub</a></div>{recordedUrl && <div className="footer-actions"><button className="plain-button" onClick={() => setShowPreview(true)}><Play size={13} /> Review latest take</button><a className="plain-button" href={recordedUrl} download={downloadName}>Download <Download size={13} /></a></div>}</footer>
    {showPreview && recordedUrl && <div className="modal-backdrop"><div className="review-card" role="dialog" aria-modal="true" aria-label="Review recording"><div className="review-header"><div><p className="eyebrow">Take complete</p><h2>Review recording</h2></div><button autoFocus className="icon-button" aria-label="Close review" onClick={() => setShowPreview(false)}><X size={18} /></button></div><video src={recordedUrl} controls playsInline /><div className="review-footer"><span>Video ready</span><a className="download-button" href={recordedUrl} download={downloadName}><Download size={15} /> Download video</a></div></div></div>}
    {isSetupOpen && <div className="modal-backdrop"><div className="setup-card" role="dialog" aria-modal="true" aria-label="Studio setup"><div className="review-header"><div><h2>Studio setup</h2></div><button autoFocus className="icon-button" aria-label="Close setup" onClick={() => setSetupOpen(false)}><X size={18} /></button></div><div className="device-list"><div className="device-row"><Camera size={19} /><div><strong>Camera & microphone</strong><small>{cameraReady ? 'Connected and ready' : 'Use your browser’s default devices'}</small></div>{cameraReady ? <CheckCircle2 size={16} /> : <button className="device-action" onClick={requestCamera}>Connect</button>}</div><div className="device-row"><KeyRound size={19} /><div><strong>OpenAI transcription key</strong><small>{openAiKey ? 'Saved locally · never sent to Cuelance' : 'Missing · local voice-follow demo will be used'}</small></div>{openAiKey ? <CheckCircle2 size={16} /> : <span className="missing-label">Missing</span>}</div></div><label className="key-field">Local OpenAI API key<input type="password" value={openAiKey} onChange={(event) => setOpenAiKey(event.target.value)} placeholder="sk-…" autoComplete="off" /><small>For local development only. This key is stored in this browser and is not included in production assets.</small></label>{mediaError && <p role="alert" className="privacy-box">{mediaError}</p>}<div className="privacy-box"><ShieldCheck size={17} /> Scripts and recordings stay on this device. Camera video is never uploaded. Add a key only if you want to connect OpenAI transcription locally.</div><button className="primary-button" style={{marginTop:24}} onClick={() => setSetupOpen(false)}>Back to studio <ArrowRight size={16} /></button></div></div>}
  </div>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
