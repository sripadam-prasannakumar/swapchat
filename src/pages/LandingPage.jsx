import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

/* ── Scroll-reveal hook ── */
function useReveal() {
    const ref = useRef(null);
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
            { threshold: 0.12 }
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, []);
    return [ref, visible];
}

/* ── Avatar images (floating in hero) ── */
const AVATARS = [
    { src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDuVzaVdkZfGsKEsQsiz4IOUcyE5sAMO0UcIeDysvzadesPO95fu80t4hy7GydgOb-NWhvKnHMmTg74u-01ZbtygWCI-nNemaAf1Qmwc3heGHHKMTFZCH-icHk2EqUYGHvMRYzNO5K9J0KzxsalTOG3Q9UD92qFFvUoB6F5AtcQwbtL9gk2VH5I0DEjTJpki_eOhwkl6Sq9tQftP3zpdDTU0aqh074IR9F-dfXMfqHHGAOkEZJ10pJzyH-Sf78PnVFbitwp0gAPdDQE', cls: 'avatar-1', size: 'w-20 h-20' },
    { src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBOh-AKKGq68QPI1U6PdkGtycwMgXA1jwcf9gh6vHECzPUmPsYWocqemc-DZFiun1WxOvd29GJpVdA-x5sbA9MFjUcF8wufNxGlSSuZnELyu6FgkaxWZFOrN19ZQ7dABoLVMvEqW7MT1oTJSm3KM92KQ0HcSYeKwJsMYEXp9tfZ0xj-l7ZJF5AQvNxgDZFzyIuvJhjISrOStax-mbOW94vz7i6zU4TygsCRtw6nS80qsAv2uVDP_-ArbxDPn2vlKu8f2jsSxaGfVpm_', cls: 'avatar-2', size: 'w-16 h-16' },
    { src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB1tW5QBPQegNUZRYZqzqFmlgchPckxO8oTgPKpnwA8xnXqZ6ihRQAynUO8tGaF5hzml4yH3ilMAwkcQMVzZAE0FCdn7vIJQl53xYyqEmcuHvI1Ua97Tk1Bm8NxB1nTlFHIXcNRN_GGUKHwrDLBWbJFDQQoCy5WWJzqXhX_Yg0RCKBBH7OLK3tfXuPXxSYJQC5b94-oH0W5bB3wr1XdaCZd3WBB9w4VS9zWnyqaDErJqdlo2WsxvFGVinZtPPCH5dkw6o49kAisVpMF', cls: 'avatar-3', size: 'w-24 h-24' },
    { src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBbeywZeszfd_S_SMHPintt2BTSbQxd7xYQOiH72NDdcIKza2ewlHzEDMRI75fXTVJ2nlWS2W6SUoISOwQCGE9XUkd9d9px_oPQ6b6mnTqqCzJv25dX7kX5LvJiuv8rxSnNglurlYz8WewXQ3qfUTlRXxU7j0fZ00ecJc69o1E5Tyj95PD19XAvItsW93JNOvVnVCQyEibYz4x4yghcDylOgf-5FFagezJDdisKd6dD4NMB3VO8uo9rWAt3CsAXPXo58qC6bJXQutzV', cls: 'avatar-4', size: 'w-14 h-14' },
];

const TESTIMONIALS = [
    {
        quote: '"Sync has completely transformed how our engineering team communicates. The real-time updates are actually real-time."',
        name: 'David Miller', role: 'CTO, TechFlow',
        img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDdK78ZSwKAdE1wIApGP-zJvqW1qs-eh902M_5554gCFgIbcVG4oOgYHanbR4O_D9tydayWQNDJ-amvwf4Aek8wqo6-SXRFZpFYSC-i0im42ZoQjhGkqQY-OAFyFFUUEv5H6dxbFMn0UPORv2cAtwD0RaG3bFUonsKE70-C8JROCebiS44_KSQYwhj1j9r9O03owSviwkux4Gsb-rytjxSSi-YhpSy5cyzsaovMmNz8tNE6muc_lpPz57RESojZC37Wx6L5FfFFqdrv',
    },
    {
        quote: '"The security protocols in Sync give our legal department peace of mind while maintaining agility for our creative teams."',
        name: 'Elena Rodriguez', role: 'Director of Product, Nexus',
        img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAdGt18HVZWmEvK2kITc2liFF8zQEkSyBKJb5NDu5RfhjmXG4yzEPhVnLFVoZSiA9LFlD4TsrjeoH9_XkD4lBwJbHJke7O9HHXABSn0s_8eylZc5_aGzaepItazpmXIWBz7K-Y95GxnTmwhm9Hx5hwkTmi07Oh2_j0TJAmit3GYsYTl4k6cN6RCQzydpvm6Zs4t6sK7x4j3vItpVhU0dOhak8Gt_QP9BpuWmavDasgLyQFqg0hTmq3xBeYjDyoC0PmK8MKDnwB6YS-8',
    },
    {
        quote: '"Transitioning to Sync was the best decision we made for remote collaboration. It\'s minimal, fast, and extremely reliable."',
        name: 'Marcus Thorne', role: 'Project Manager, Apex Corp',
        img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDliyCAZm3eePJtUiYbrowggr2UtKHSRxS9XHJuBI2nyNkZ1K6vfw81Z56lH8NkqS0XL75V2b96uPlDvWmc37mr1EQW0ttoEHwN3Yjh9InItg1PSVwYjJDZ5fFkIJbUiWgWlg0OdNxAWPNunXV863wCR337ivpumWLddaoKt0Eei6_fS21QK5fTmtNJOQy67wsWF4mHAmTMDwAEJOY8tlcwJSpNFnJMN6KyyD3Y4zQahBTbRwwC0-nfXBFUsyVZtmUpgeQdCXOal6x0',
    },
];

/* ── Reveal wrapper component ── */
function Reveal({ children, className = '', delay = 0, direction = 'up' }) {
    const [ref, visible] = useReveal();
    const animMap = { up: 'reveal-up', left: 'reveal-left', right: 'reveal-right', fade: 'reveal-fade' };
    return (
        <div
            ref={ref}
            className={`reveal-base ${animMap[direction] || 'reveal-up'} ${visible ? 'revealed' : ''} ${className}`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {children}
        </div>
    );
}

const LandingPage = () => {
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <div className="dark bg-background-dark text-slate-100 font-display min-h-screen overflow-x-hidden">

            {/* ── NAVIGATION ── */}
            <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'nav-scrolled' : 'nav-top'}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        {/* Logo */}
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/40">
                                <span className="material-icons text-white">sync</span>
                            </div>
                            <span className="text-2xl font-bold tracking-tighter text-white">SwapChat</span>
                        </div>

                        {/* Desktop Nav */}
                        <div className="hidden md:flex items-center space-x-8">
                            <a className="text-sm font-medium text-slate-400 hover:text-primary transition-colors" href="#features">Features</a>
                            <a className="text-sm font-medium text-slate-400 hover:text-primary transition-colors" href="#preview">Product</a>
                            <a className="text-sm font-medium text-slate-400 hover:text-primary transition-colors" href="#pricing">Pricing</a>
                            <button
                                onClick={() => navigate('/login')}
                                className="text-sm font-semibold text-slate-300 hover:text-white transition-colors"
                            >Sign In</button>
                            <button
                                onClick={() => navigate('/register')}
                                className="px-5 py-2.5 rounded-lg bg-primary text-white font-semibold hover:opacity-90 hover:scale-105 transition-all shadow-lg shadow-primary/30"
                            >Get Started</button>
                        </div>

                        {/* Mobile hamburger */}
                        <button
                            className="md:hidden text-slate-300 hover:text-white transition-colors"
                            onClick={() => setMenuOpen(!menuOpen)}
                        >
                            <span className="material-icons text-2xl">{menuOpen ? 'close' : 'menu'}</span>
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                <div className={`md:hidden mobile-menu ${menuOpen ? 'mobile-menu--open' : ''}`}>
                    <div className="px-6 py-6 space-y-4">
                        <a className="block text-sm font-medium text-slate-300 hover:text-primary transition-colors" href="#features" onClick={() => setMenuOpen(false)}>Features</a>
                        <a className="block text-sm font-medium text-slate-300 hover:text-primary transition-colors" href="#preview" onClick={() => setMenuOpen(false)}>Product</a>
                        <a className="block text-sm font-medium text-slate-300 hover:text-primary transition-colors" href="#pricing" onClick={() => setMenuOpen(false)}>Pricing</a>
                        <button onClick={() => { navigate('/login'); setMenuOpen(false); }} className="block w-full text-left text-sm font-medium text-slate-300 hover:text-primary transition-colors">Sign In</button>
                        <button onClick={() => { navigate('/register'); setMenuOpen(false); }} className="w-full px-5 py-3 rounded-lg bg-primary text-white font-semibold hover:opacity-90 transition-all">Get Started</button>
                    </div>
                </div>
            </nav>

            {/* ── HERO ── */}
            <section className="relative pt-32 pb-20 overflow-hidden hero-gradient min-h-screen flex items-center">
                {/* Background orbs */}
                <div className="hero-orb hero-orb-1" />
                <div className="hero-orb hero-orb-2" />
                <div className="hero-orb hero-orb-3" />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
                    <div className="text-center max-w-3xl mx-auto">
                        <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
                            <span className="inline-block py-1 px-4 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-bold tracking-widest uppercase mb-6">
                                Next Gen Communication
                            </span>
                        </div>
                        <h1 className="hero-title text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight animate-fade-up" style={{ animationDelay: '0.2s' }}>
                            Communicate with{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">
                                Precision
                            </span>
                        </h1>
                        <p className="text-xl text-slate-400 mb-10 leading-relaxed animate-fade-up" style={{ animationDelay: '0.35s' }}>
                            Align your team with the next generation of secure, real-time communication tools designed for high-performance enterprises.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-up" style={{ animationDelay: '0.5s' }}>
                            <button
                                onClick={() => navigate('/register')}
                                className="px-8 py-4 rounded-xl bg-primary text-white font-bold text-lg hover:scale-105 transition-transform shadow-xl shadow-primary/40 animate-pulse-glow"
                            >
                                Get Started for Free
                            </button>
                            <button
                                onClick={() => navigate('/login')}
                                className="px-8 py-4 rounded-xl glass-btn text-white font-bold text-lg hover:bg-white/5 transition-colors"
                            >
                                Sign In →
                            </button>
                        </div>
                    </div>
                </div>

                {/* Floating Avatars */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {AVATARS.map((av, i) => (
                        <div key={i} className={`absolute ${av.cls} ${i % 2 === 0 ? 'animate-float' : 'animate-float-delayed'}`}>
                            <img
                                src={av.src}
                                alt="avatar"
                                className={`${av.size} rounded-full border-4 border-primary/30 object-cover shadow-2xl`}
                            />
                        </div>
                    ))}

                    {/* Chat Bubbles */}
                    <div className="absolute top-1/3 right-[22%] glass-card p-4 rounded-2xl max-w-[200px] animate-float chat-bubble-1">
                        <p className="text-xs text-slate-300">Project sync at 4 PM? 📅</p>
                    </div>
                    <div className="absolute bottom-1/4 left-[25%] glass-card p-3 rounded-2xl max-w-[190px] animate-float-delayed chat-bubble-2">
                        <p className="text-xs text-slate-300">Security audit complete ✅</p>
                    </div>
                    <div className="absolute top-[55%] right-[8%] glass-card p-3 rounded-2xl max-w-[160px] animate-float chat-bubble-3">
                        <p className="text-xs text-slate-300">Shipped! 🚀</p>
                    </div>
                </div>

                {/* Scroll indicator */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 scroll-indicator animate-bounce">
                    <span className="material-icons text-slate-500 text-2xl">keyboard_arrow_down</span>
                </div>
            </section>

            {/* ── FEATURES ── */}
            <section className="py-24 bg-background-dark" id="features">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <Reveal className="text-center mb-16">
                        <span className="text-primary text-xs font-bold uppercase tracking-widest">Why SwapChat</span>
                        <h2 className="text-4xl font-bold mt-3 mb-4">Built for Modern Teams</h2>
                        <p className="text-slate-400 max-w-xl mx-auto">Everything your team needs to stay in sync — fast, secure, and beautifully simple.</p>
                    </Reveal>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            { icon: 'bolt', title: 'Real-time Sync', desc: 'Instant message delivery across all devices with zero latency. Stay connected whether you\'re at your desk or on the move.', delay: 0 },
                            { icon: 'security', title: 'End-to-End Security', desc: 'Enterprise-grade encryption for every conversation. Your data remains yours, protected by industry-leading protocols.', delay: 100 },
                            { icon: 'public', title: 'Global Collaboration', desc: 'Bridge the gap between time zones seamlessly with smart scheduling and async communication features.', delay: 200 },
                        ].map((f) => (
                            <Reveal key={f.icon} delay={f.delay} direction="up">
                                <div className="group p-8 rounded-xl glass-card border border-primary/10 hover:border-primary/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_0_30px_rgba(127,19,236,0.2)] h-full">
                                    <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform">
                                        <span className="material-icons">{f.icon}</span>
                                    </div>
                                    <h3 className="text-2xl font-bold mb-4">{f.title}</h3>
                                    <p className="text-slate-400 leading-relaxed">{f.desc}</p>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── PRODUCT PREVIEW ── */}
            <section className="py-24 relative" id="preview">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <Reveal className="text-center mb-16">
                        <h2 className="text-4xl font-bold mb-6">Designed for Focus</h2>
                        <p className="text-slate-400 max-w-2xl mx-auto">A clean, intuitive interface that puts your conversations first without the clutter of traditional apps.</p>
                    </Reveal>

                    <Reveal direction="up" delay={100}>
                        <div className="relative max-w-5xl mx-auto glass-card rounded-xl overflow-hidden shadow-2xl border border-primary/30">
                            {/* Window chrome */}
                            <div className="bg-black/40 px-6 py-3 border-b border-primary/20 flex items-center justify-between">
                                <div className="flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500/60" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                                    <div className="w-3 h-3 rounded-full bg-green-500/60" />
                                </div>
                                <div className="text-xs text-slate-500 font-mono tracking-widest uppercase">SwapChat Workspace v2.4</div>
                                <div className="w-16" />
                            </div>

                            <div className="flex h-[520px] md:h-[600px]">
                                {/* Sidebar */}
                                <div className="w-64 bg-black/20 border-r border-primary/10 p-6 hidden md:block">
                                    <div className="mb-8">
                                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Channels</div>
                                        <ul className="space-y-2 text-sm">
                                            <li className="flex items-center gap-2 text-primary font-bold"><span>#</span> marketing-team</li>
                                            <li className="flex items-center gap-2 text-slate-400"><span>#</span> product-sync</li>
                                            <li className="flex items-center gap-2 text-slate-400"><span>#</span> announcements</li>
                                        </ul>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Direct Messages</div>
                                        <ul className="space-y-4 text-sm">
                                            <li className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-green-500" /><span className="text-slate-300">Alex Rivera</span></li>
                                            <li className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-green-500" /><span className="text-slate-300">Sarah Chen</span></li>
                                            <li className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-slate-600" /><span className="text-slate-500">Michael Scott</span></li>
                                        </ul>
                                    </div>
                                </div>

                                {/* Chat area */}
                                <div className="flex-1 flex flex-col">
                                    <div className="p-6 border-b border-primary/10 flex justify-between items-center">
                                        <div>
                                            <h4 className="font-bold"># marketing-team</h4>
                                            <span className="text-xs text-slate-500">Discussing Q4 launch assets</span>
                                        </div>
                                        <div className="flex gap-4 text-slate-400">
                                            <span className="material-icons text-xl cursor-pointer hover:text-primary transition-colors">search</span>
                                            <span className="material-icons text-xl cursor-pointer hover:text-primary transition-colors">more_vert</span>
                                        </div>
                                    </div>

                                    <div className="flex-1 p-6 space-y-8 overflow-y-auto">
                                        <div className="flex gap-4">
                                            <img className="w-10 h-10 rounded-lg object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBQ0o33vR6Zqn03WjUtGUqt855Wvn8Q3klXmi3k4QtNWeUo8iW_fKMl0qX42P8Re4sm59WH83vyFSPiUQ0F1PY4u9kcflmPqQJw9zKJ116e0qXthnZWIosfqlPM8e-eRFvhanVQd_zmh4KnFNDKiZDkMODnMlOCNeNQD7aLeBySBKLm2iRaf-DlNG0je6kTFovQF99iMz-OEy6g71UptthmhweU-VT1sUxxT9Q8P58ARy5OQIqTm-sV0SMam-MujAZVg6fn2stagWwh" alt="Sarah" />
                                            <div>
                                                <div className="flex items-baseline gap-2 mb-1">
                                                    <span className="font-bold text-sm">Sarah Chen</span>
                                                    <span className="text-[10px] text-slate-500 uppercase">10:42 AM</span>
                                                </div>
                                                <p className="text-sm text-slate-300 leading-relaxed bg-primary/5 p-3 rounded-xl rounded-tl-none inline-block border border-primary/10">
                                                    Hey team! I've just uploaded the final design assets for the landing page. Let me know what you think.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-4">
                                            <img className="w-10 h-10 rounded-lg object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCO6MVhsRvWJ2bL_QGszi4Z-u3U58xX7clkglXjZ72PlFGpntRozjoF_1yHlXdI8CwMu1uBh2WTaPFamdPdYLZ-Qn-_zf1_Jx483S1X9yhV2b-MlGkZMNNNHkvr6kPuo-xRaJOho8ZnWYekdDnwWR35DGBdxopBbfklAtjqXiSDIYKZXccEcHExGWCxN8mPyshffU0OA1yJljI4EtcRAiZPLK-aFjg217SozCCLNxlfsUHyxlx3pBMbc2rJ-kjaTOFFlQaEhQ8RUOhn" alt="Alex" />
                                            <div>
                                                <div className="flex items-baseline gap-2 mb-1">
                                                    <span className="font-bold text-sm">Alex Rivera</span>
                                                    <span className="text-[10px] text-slate-500 uppercase">10:45 AM</span>
                                                </div>
                                                <p className="text-sm text-slate-300 leading-relaxed bg-white/5 p-3 rounded-xl rounded-tl-none inline-block border border-white/5">
                                                    These look amazing, Sarah! The precision in the iconography really hits the mark.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Input */}
                                    <div className="p-6">
                                        <div className="glass-card border border-primary/20 rounded-xl flex items-center p-3 gap-3">
                                            <span className="material-icons text-slate-500 cursor-pointer hover:text-primary transition-colors">add_circle</span>
                                            <input className="bg-transparent border-none outline-none text-sm flex-1 text-slate-300 placeholder-slate-600" placeholder="Message #marketing-team" type="text" readOnly />
                                            <div className="flex gap-3 text-slate-500">
                                                <span className="material-icons text-xl cursor-pointer hover:text-primary transition-colors">face</span>
                                                <span className="material-icons text-xl cursor-pointer hover:text-primary transition-colors">send</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Reveal>
                </div>
            </section>

            {/* ── TESTIMONIALS ── */}
            <section className="py-24 bg-background-dark">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <Reveal className="text-center mb-16">
                        <h2 className="text-3xl font-bold">Trusted by Innovation Leaders</h2>
                    </Reveal>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {TESTIMONIALS.map((t, i) => (
                            <Reveal key={i} delay={i * 120} direction="up">
                                <div className="p-8 rounded-xl glass-card border border-primary/10 relative h-full hover:border-primary/30 transition-all duration-300 hover:-translate-y-1">
                                    <span className="material-icons text-primary/25 text-5xl absolute top-4 right-4">format_quote</span>
                                    <p className="text-slate-300 mb-8 italic leading-relaxed">{t.quote}</p>
                                    <div className="flex items-center gap-4">
                                        <img className="w-12 h-12 rounded-full object-cover border-2 border-primary/30" src={t.img} alt={t.name} />
                                        <div>
                                            <div className="font-bold text-white">{t.name}</div>
                                            <div className="text-xs text-primary font-semibold uppercase tracking-widest">{t.role}</div>
                                        </div>
                                    </div>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── PRICING ── */}
            <section className="py-24" id="pricing">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <Reveal className="text-center mb-16">
                        <h2 className="text-4xl font-bold mb-6">Simple, Transparent Pricing</h2>
                        <p className="text-slate-400">Choose the plan that fits your team's size and ambition.</p>
                    </Reveal>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
                        {/* Free */}
                        <Reveal delay={0} direction="up">
                            <div className="p-8 rounded-xl glass-card border border-primary/10 flex flex-col hover:scale-105 transition-transform duration-300 h-full">
                                <div className="mb-8">
                                    <h3 className="text-xl font-bold mb-2">Free</h3>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-extrabold">$0</span>
                                        <span className="text-slate-500">/month</span>
                                    </div>
                                    <p className="text-sm text-slate-500 mt-4">Perfect for small teams getting started.</p>
                                </div>
                                <ul className="space-y-4 mb-8 flex-1">
                                    {['Unlimited messages', '1:1 Voice calls', '5GB File storage'].map(f => (
                                        <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                                            <span className="material-icons text-primary text-sm">check_circle</span> {f}
                                        </li>
                                    ))}
                                </ul>
                                <button onClick={() => navigate('/register')} className="w-full py-3 rounded-lg border border-primary/50 text-primary font-bold hover:bg-primary/10 transition-colors">
                                    Start Free
                                </button>
                            </div>
                        </Reveal>

                        {/* Pro */}
                        <Reveal delay={100} direction="up">
                            <div className="p-8 rounded-xl glass-card border-2 border-primary relative flex flex-col md:-translate-y-4 shadow-[0_0_50px_rgba(127,19,236,0.3)] bg-gradient-to-b from-primary/10 to-transparent hover:scale-105 transition-transform duration-300 h-full">
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-bold uppercase tracking-widest px-4 py-1 rounded-full">Most Popular</div>
                                <div className="mb-8">
                                    <h3 className="text-xl font-bold mb-2">Pro</h3>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-extrabold">$12</span>
                                        <span className="text-slate-500">/user/mo</span>
                                    </div>
                                    <p className="text-sm text-slate-400 mt-4">Advanced tools for growing power teams.</p>
                                </div>
                                <ul className="space-y-4 mb-8 flex-1">
                                    {['Everything in Free', 'Group video calls', '50GB File storage', 'Custom app integrations'].map(f => (
                                        <li key={f} className="flex items-center gap-2 text-sm text-slate-200">
                                            <span className="material-icons text-primary text-sm">check_circle</span> {f}
                                        </li>
                                    ))}
                                </ul>
                                <button onClick={() => navigate('/register')} className="w-full py-3 rounded-lg bg-primary text-white font-bold hover:opacity-90 transition-all animate-pulse-glow">
                                    Go Pro Now
                                </button>
                            </div>
                        </Reveal>

                        {/* Enterprise */}
                        <Reveal delay={200} direction="up">
                            <div className="p-8 rounded-xl glass-card border border-primary/10 flex flex-col hover:scale-105 transition-transform duration-300 h-full">
                                <div className="mb-8">
                                    <h3 className="text-xl font-bold mb-2">Enterprise</h3>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-extrabold">Custom</span>
                                    </div>
                                    <p className="text-sm text-slate-500 mt-4">Security and control for large organizations.</p>
                                </div>
                                <ul className="space-y-4 mb-8 flex-1">
                                    {['Unlimited everything', 'Dedicated account manager', 'SSO & Advanced Audit logs'].map(f => (
                                        <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                                            <span className="material-icons text-primary text-sm">check_circle</span> {f}
                                        </li>
                                    ))}
                                </ul>
                                <button className="w-full py-3 rounded-lg border border-primary/50 text-primary font-bold hover:bg-primary/10 transition-colors">
                                    Contact Sales
                                </button>
                            </div>
                        </Reveal>
                    </div>
                </div>
            </section>

            {/* ── CTA BANNER ── */}
            <section className="py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <Reveal>
                        <div className="cta-banner rounded-3xl p-8 md:p-16 text-center relative overflow-hidden">
                            <div className="cta-glow" />
                            <div className="relative z-10">
                                <h2 className="text-3xl md:text-5xl font-black text-white mb-6">Ready to upgrade your team's workflow?</h2>
                                <p className="text-white/80 text-lg mb-10 max-w-2xl mx-auto">Join over 10,000 teams already using SwapChat. Start your 14-day free trial today, no credit card required.</p>
                                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                    <button onClick={() => navigate('/register')} className="w-full sm:w-auto px-10 py-4 bg-white text-primary font-black rounded-xl hover:bg-slate-100 transition-all hover:scale-105">
                                        Start Free Trial
                                    </button>
                                    <button onClick={() => navigate('/login')} className="w-full sm:w-auto px-10 py-4 bg-white/10 text-white font-bold rounded-xl border border-white/30 hover:bg-white/20 transition-all">
                                        Sign In
                                    </button>
                                </div>
                            </div>
                        </div>
                    </Reveal>
                </div>
            </section>

            {/* ── FOOTER ── */}
            <footer className="py-20 border-t border-primary/10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-16">
                        <div className="col-span-2 md:col-span-1">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                                    <span className="material-icons text-white text-sm">sync</span>
                                </div>
                                <span className="text-xl font-bold tracking-tighter text-white">SwapChat</span>
                            </div>
                            <p className="text-slate-500 text-sm leading-relaxed mb-6">Redefining modern communication for teams who prioritize precision and security.</p>
                            <div className="flex gap-4">
                                <a className="text-slate-500 hover:text-primary transition-colors" href="#"><span className="material-icons text-xl">public</span></a>
                                <a className="text-slate-500 hover:text-primary transition-colors" href="#"><span className="material-icons text-xl">alternate_email</span></a>
                                <a className="text-slate-500 hover:text-primary transition-colors" href="#"><span className="material-icons text-xl">campaign</span></a>
                            </div>
                        </div>
                        {[
                            { title: 'Product', links: ['Features', 'Integrations', 'Enterprise', 'Solutions'] },
                            { title: 'Resources', links: ['Documentation', 'Security', 'Status', 'Help Center'] },
                            { title: 'Company', links: ['About Us', 'Careers', 'Blog', 'Contact'] },
                        ].map(col => (
                            <div key={col.title}>
                                <h4 className="font-bold mb-6 text-white">{col.title}</h4>
                                <ul className="space-y-4 text-sm text-slate-500">
                                    {col.links.map(l => <li key={l}><a className="hover:text-primary transition-colors" href="#">{l}</a></li>)}
                                </ul>
                            </div>
                        ))}
                    </div>
                    <div className="pt-8 border-t border-primary/5 flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-xs text-slate-600">© 2024 SwapChat Inc. All rights reserved.</p>
                        <div className="flex gap-6 text-xs text-slate-600">
                            <a className="hover:text-primary transition-colors" href="#">Privacy Policy</a>
                            <a className="hover:text-primary transition-colors" href="#">Terms of Service</a>
                            <a className="hover:text-primary transition-colors" href="#">Cookie Settings</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
