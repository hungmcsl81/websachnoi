import React, { useEffect, useState, useRef } from "react";

// Minimal CSS (you can move this into index.css). Keep styling simple and responsive.
const styles = `
:root{--bg:#0f172a;--card:#0b1220;--muted:#9aa4b2;--accent:#06b6d4}
*{box-sizing:border-box}
body{margin:0;font-family:Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;background:linear-gradient(180deg,#071023 0%, #071a2a 100%);color:#e6eef6}
.app{max-width:1100px;margin:28px auto;padding:18px}
.header{display:flex;gap:16px;align-items:center;justify-content:space-between}
.card{background:rgba(255,255,255,0.03);border-radius:12px;padding:14px}
.controls{display:flex;gap:12px;flex-wrap:wrap}
.input{width:100%;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.06);background:transparent;color:inherit}
.btn{background:var(--accent);color:#042024;padding:8px 12px;border-radius:8px;border:none;cursor:pointer}
.small{font-size:13px;color:var(--muted)}
.grid{display:grid;grid-template-columns:1fr 360px;gap:18px;margin-top:18px}
.library{display:flex;flex-direction:column;gap:10px}
.book{display:flex;gap:10px;align-items:center;padding:10px;border-radius:8px;background:rgba(255,255,255,0.02)}
.book .meta{flex:1}
.audio-player{width:100%}
.footer{margin-top:18px;color:var(--muted);font-size:13px}
@media(max-width:900px){.grid{grid-template-columns:1fr}}
`;

export default function App() {
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [text, setText] = useState("");
  const [library, setLibrary] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("wsn_library") || "[]");
    } catch (e) { return []; }
  });
  const [audioFiles, setAudioFiles] = useState([]); // {id, name, url, file}
  const audioRef = useRef();
  const utterRef = useRef(null);

  useEffect(() => {
    // inject styles once
    if (!document.getElementById("wsn-styles")) {
      const s = document.createElement("style");
      s.id = "wsn-styles";
      s.innerText = styles;
      document.head.appendChild(s);
    }

    function loadVoices() {
      const v = window.speechSynthesis.getVoices() || [];
      setVoices(v);
      // prefer a Vietnamese voice if exists
      const vi = v.find(x => /vi|vietnamese/i.test(x.lang + x.name));
      setSelectedVoice(vi ? vi.name : (v[0] && v[0].name));
    }

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  useEffect(() => {
    localStorage.setItem("wsn_library", JSON.stringify(library));
  }, [library]);

  function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    const newFiles = files.map(f => ({ id: crypto.randomUUID(), name: f.name, url: URL.createObjectURL(f), file: f }));
    setAudioFiles(prev => [...newFiles, ...prev]);
  }

  function playAudioURL(url) {
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.play();
    }
  }

  function speakText(t) {
    if (!t) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t);
    const v = voices.find(v => v.name === selectedVoice);
    if (v) u.voice = v;
    u.rate = rate;
    u.pitch = pitch;
    utterRef.current = u;
    window.speechSynthesis.speak(u);
  }

  function stopSpeaking() {
    window.speechSynthesis.cancel();
  }

  function saveBook(kind = "text", audioRefId = null) {
    const id = crypto.randomUUID();
    const book = { id, title: title || `Untitled ${new Date().toLocaleString()}`, author, kind, text: kind === 'text' ? text : '', audioRefId, createdAt: new Date().toISOString() };
    setLibrary(prev => [book, ...prev]);
    setTitle(""); setAuthor(""); setText("");
  }

  function deleteBook(id) {
    setLibrary(prev => prev.filter(b => b.id !== id));
  }

  function downloadText(book) {
    const blob = new Blob([book.text || ""], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${(book.title || 'book').replace(/[^a-z0-9\\-]/gi,'_')}.txt`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  function downloadAudioFile(fileObj) {
    // fileObj.file exists for uploads
    if (fileObj.file) {
      const a = document.createElement('a');
      a.href = fileObj.url; a.download = fileObj.name;
      document.body.appendChild(a); a.click(); a.remove();
    } else {
      alert('Không có file để tải xuống.');
    }
  }

  return (
    <div className="app">
      <div className="header">
        <div>
          <h1 style={{margin:0}}>Web Sách Nói — bản triển khai nhanh</h1>
          <div className="small">Ứng dụng client-side: upload audio, paste văn bản, phát bằng SpeechSynthesis (Tiếng Việt nếu trình duyệt hỗ trợ)</div>
        </div>
        <div>
          <button className="btn" onClick={() => {
            // export library JSON
            const blob = new Blob([JSON.stringify({library, audioFilesMeta: audioFiles.map(f=>({id:f.id,name:f.name}))}, null, 2)], {type:'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'wsn_library.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
          }}>Export Library</button>
        </div>
      </div>

      <div className="grid">
        <div>
          <div className="card">
            <h3>1) Tải lên tệp âm thanh</h3>
            <div className="small">Bạn có thể upload nhiều tệp (mp3, wav...). Sau khi upload, bấm "Play" để nghe.</div>
            <div style={{marginTop:10}}>
              <input className="input" type="file" accept="audio/*" multiple onChange={handleFiles} />
            </div>

            <div style={{marginTop:12}} className="library">
              {audioFiles.length === 0 && <div className="small">Chưa có tệp âm thanh nào.</div>}
              {audioFiles.map(f => (
                <div className="book" key={f.id}>
                  <div style={{width:64,height:64,background:'linear-gradient(135deg,#075985,#06b6d4)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700}}>{f.name.slice(0,1).toUpperCase()}</div>
                  <div className="meta">
                    <div style={{fontWeight:600}}>{f.name}</div>
                    <div className="small">Uploaded</div>
                    <div style={{marginTop:8,display:'flex',gap:8}}>
                      <button className="btn" onClick={() => playAudioURL(f.url)}>Play</button>
                      <button className="btn" onClick={() => downloadAudioFile(f)}>Download</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{marginTop:14}}>
            <h3>2) Dán / tải văn bản — chuyển thành giọng nói</h3>
            <div className="small">Dán nội dung sách hoặc một chương, chọn giọng (nếu trình duyệt có tiếng Việt) rồi bấm Play.</div>
            <div style={{marginTop:10}}>
              <input className="input" placeholder="Tiêu đề (tuỳ chọn)" value={title} onChange={e=>setTitle(e.target.value)} />
              <input className="input" placeholder="Tác giả (tuỳ chọn)" value={author} onChange={e=>setAuthor(e.target.value)} style={{marginTop:8}} />
              <textarea className="input" rows={10} placeholder="Dán văn bản ở đây..." value={text} onChange={e=>setText(e.target.value)} style={{marginTop:8}} />
            </div>
            <div style={{marginTop:10,display:'flex',gap:8,alignItems:'center'}}>
              <select className="input" style={{width:260}} value={selectedVoice||''} onChange={e=>setSelectedVoice(e.target.value)}>
                <option value="">-- Chọn giọng (browser voices) --</option>
                {voices.map(v => <option key={v.name} value={v.name}>{v.name} — {v.lang}</option>)}
              </select>
              <div style={{display:'flex',gap:8,alignItems:'center'}} className="small">
                <label>Rate</label>
                <input type="range" min="0.5" max="2" step="0.1" value={rate} onChange={e=>setRate(Number(e.target.value))} />
                <span>{rate.toFixed(1)}</span>
                <label>Pitch</label>
                <input type="range" min="0.5" max="2" step="0.1" value={pitch} onChange={e=>setPitch(Number(e.target.value))} />
                <span>{pitch.toFixed(1)}</span>
              </div>
            </div>
            <div style={{marginTop:10,display:'flex',gap:8}}>
              <button className="btn" onClick={() => speakText(text)}>Play</button>
              <button className="btn" onClick={stopSpeaking}>Stop</button>
              <button className="btn" onClick={() => saveBook('text')}>Save as Book</button>
            </div>
            <div className="small" style={{marginTop:8}}>Ghi chú: Nếu trình duyệt không có giọng tiếng Việt, hãy thử Chrome/Edge và kiểm tra phần voice list.</div>
          </div>

          <div className="card" style={{marginTop:14}}>
            <h3>3) Player</h3>
            <audio ref={audioRef} className="audio-player" controls />
            <div className="small" style={{marginTop:8}}>Player dùng để phát tệp bạn upload hoặc tệp audio mà bạn tải về.</div>
          </div>
        </div>

        <aside>
          <div className="card">
            <h3>Library — sách đã lưu</h3>
            <div className="small">Sách lưu trữ trong localStorage thiết bị. Bạn có thể export library (nút Export Library trên header).</div>
            <div style={{marginTop:12}}>
              {library.length === 0 && <div className="small">Chưa có sách lưu.</div>}
              {library.map(b => (
                <div key={b.id} className="book">
                  <div style={{width:48,height:48,background:'linear-gradient(135deg,#0ea5a4,#0284c7)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700}}>{(b.title||'U').slice(0,1).toUpperCase()}</div>
                  <div className="meta">
                    <div style={{fontWeight:700}}>{b.title || 'Untitled'}</div>
                    <div className="small">{b.author || '—'} • {new Date(b.createdAt).toLocaleString()}</div>
                    <div style={{marginTop:8,display:'flex',gap:8}}>
                      {b.kind === 'text' && <button className="btn" onClick={() => speakText(b.text)}>Play TTS</button>}
                      <button className="btn" onClick={() => downloadText(b)}>Download TXT</button>
                      <button className="btn" onClick={() => { if (confirm('Xóa sách này?')) deleteBook(b.id); }}>Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{marginTop:12}}>
            <h3>Quick tips</h3>
            <ul className="small">
              <li>Để có giọng tiếng Việt tốt, thử Chrome/Edge và kiểm tra voices (chrome://settings/)</li>
              <li>Nếu cần xuất audio file từ TTS: dùng server-side TTS (Google Cloud, Azure, hoặc OpenAI TTS). Mình có thể giúp kèm hướng dẫn nếu muốn.</li>
              <li>Để deploy: Vercel hoặc Netlify — chỉ cần repo GitHub với build script.</li>
            </ul>
          </div>
        </aside>
      </div>

      <div className="footer">Phiên bản nhanh — nếu bạn muốn mình tạo thêm backend (upload lưu trữ, TTS server-side, user auth), mình sẽ tạo tiếp phần Node.js + sample deploy config.</div>
    </div>
  );
}
