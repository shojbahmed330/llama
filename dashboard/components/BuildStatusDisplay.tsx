
import React, { useEffect, useState } from 'react';
import { CheckCircle2, Smartphone, Download, ArrowLeft, Loader2, SmartphoneNfc, ExternalLink, Copy, Check, Globe, Layout } from 'lucide-react';
import BuildConsole from './BuildConsole';
import { BuildStep } from '../../types';

interface BuildStatusDisplayProps {
  status: string;
  message: string;
  apkUrl?: string;
  webUrl?: string;
  runUrl?: string;
  buildSteps: BuildStep[];
  handleSecureDownload: () => void;
  resetBuild: () => void;
}

const BuildStatusDisplay: React.FC<BuildStatusDisplayProps> = ({
  status, message, apkUrl, webUrl, runUrl, buildSteps, handleSecureDownload, resetBuild
}) => {
  const [qrMobileUrl, setQrMobileUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedWeb, setCopiedWeb] = useState(false);

  useEffect(() => {
    // Generate QR Code for Mobile (pointing to the GitHub Run URL for APK download)
    if (status === 'success' && runUrl) {
      import('https://esm.sh/qrcode').then(QRCode => {
        QRCode.toDataURL(runUrl, {
          width: 250,
          margin: 1,
          color: { dark: '#000000', light: '#ffffff' },
          errorCorrectionLevel: 'H'
        }).then(url => {
          setQrMobileUrl(url);
        }).catch(err => {
          console.error("QR Generation Failed for Mobile:", err);
        });
      });
    }
  }, [status, runUrl]);

  const copyUrl = async (url: string, setFn: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(url);
      setFn(true);
      setTimeout(() => setFn(false), 2000);
    } catch (err) {
      const textArea = document.createElement("textarea");
      textArea.value = url; document.body.appendChild(textArea);
      textArea.select(); document.execCommand('copy');
      document.body.removeChild(textArea);
      setFn(true); setTimeout(() => setFn(false), 2000);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-10 overflow-y-auto bg-[#09090b] min-h-full pb-32">
      <div className="glass-tech w-full max-w-3xl p-6 md:p-16 rounded-[2.5rem] md:rounded-[3rem] text-center relative overflow-hidden border-pink-500/10 shadow-2xl">
        {status === 'success' ? (
          <div className="space-y-10 animate-in zoom-in duration-500">
            <div className="w-20 h-20 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto border-2 border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
              <CheckCircle2 size={40}/>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter">Full Stack Deployed</h2>
              <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.4em]">Mobile APK & Admin Web Panel are ready</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-6">
              {/* MOBILE SIDE */}
              <div className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] space-y-6">
                <div className="flex items-center gap-3 justify-center mb-4">
                  <Smartphone className="text-pink-500" size={20}/>
                  <h3 className="text-sm font-black uppercase tracking-widest text-white">Mobile Build</h3>
                </div>
                <div className="relative p-4 bg-white rounded-[2rem] mx-auto w-[160px] h-[160px] flex items-center justify-center overflow-hidden border-4 border-pink-500/20">
                  {qrMobileUrl ? <img src={qrMobileUrl} className="w-full h-full object-contain" /> : <Loader2 className="animate-spin text-pink-500" />}
                </div>
                <div className="space-y-2">
                  <button 
                    onClick={handleSecureDownload} 
                    className="w-full flex items-center justify-center gap-3 py-4 bg-pink-600 hover:bg-pink-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all active:scale-95"
                  >
                    <Download size={14}/> Download APK (ZIP)
                  </button>
                  <p className="text-[8px] font-black text-zinc-500 uppercase mt-2">Scan QR to visit GitHub Build Page</p>
                </div>
              </div>

              {/* WEB SIDE */}
              <div className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] space-y-6">
                <div className="flex items-center gap-3 justify-center mb-4">
                  <Globe className="text-indigo-500" size={20}/>
                  <h3 className="text-sm font-black uppercase tracking-widest text-white">Admin Web</h3>
                </div>
                <div className="w-[160px] h-[160px] mx-auto bg-indigo-500/10 rounded-[2rem] flex flex-col items-center justify-center border-4 border-indigo-500/20 text-indigo-400 group relative">
                   <Layout size={48} className="group-hover:scale-110 transition-transform duration-500"/>
                   <span className="text-[8px] font-black uppercase mt-3 tracking-widest">Live Static Site</span>
                </div>
                <div className="space-y-2">
                   <button 
                     onClick={() => webUrl && window.open(webUrl, '_blank')}
                     className="w-full flex items-center justify-center gap-3 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all active:scale-95"
                   >
                     <ExternalLink size={14}/> Open Admin Panel
                   </button>
                   <button 
                     onClick={() => webUrl && copyUrl(webUrl, setCopiedWeb)}
                     className="text-[8px] font-black uppercase text-zinc-500 hover:text-white flex items-center gap-2 mx-auto mt-2"
                   >
                     {copiedWeb ? <Check size={10} className="text-green-500"/> : <Copy size={10}/>}
                     {copiedWeb ? 'Link Copied' : 'Copy Web URL'}
                   </button>
                </div>
              </div>
            </div>

            <button 
              onClick={resetBuild} 
              className="flex items-center gap-2 mx-auto text-[10px] font-black uppercase text-zinc-600 hover:text-white transition-colors border-t border-white/5 pt-6 w-full justify-center"
            >
              <ArrowLeft size={14}/> Back to Terminal
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-pink-500/20 blur-2xl rounded-full animate-pulse"></div>
              <Smartphone size={50} className="text-pink-500 relative z-10 mx-auto animate-[pulse_2s_infinite]"/>
            </div>
            
            <div>
              <h2 className="text-3xl font-black text-white uppercase tracking-tighter">
                {status === 'pushing' ? 'Deploying Source' : 'Compiling Full-Stack'}
              </h2>
              <div className="flex items-center justify-center gap-2 mt-2">
                <div className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-ping"></div>
                <p className="text-pink-400/70 font-mono text-[10px] uppercase tracking-[0.4em] font-black">
                  {message}
                </p>
              </div>
            </div>
            
            <BuildConsole buildSteps={buildSteps} />
            
            <button 
              onClick={resetBuild} 
              className="mt-6 text-[10px] font-black uppercase text-zinc-700 hover:text-red-500 transition-colors tracking-[0.2em] border border-white/5 px-6 py-3 rounded-xl hover:bg-white/5"
            >
              Terminate Deployment
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BuildStatusDisplay;
