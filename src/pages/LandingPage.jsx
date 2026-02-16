import React from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../logo.svg';

const LandingPage = () => {
    const navigate = useNavigate();

    return (
        <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-white transition-colors duration-300 min-h-screen">
            {/* Top Navigation Bar */}
            <header className="sticky top-0 z-50 w-full border-b border-solid border-border-dark bg-background-dark/80 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="text-primary">
                                <img src={logo} alt="Logo" className="w-8 h-8" />
                            </div>
                            <span className="text-xl font-bold tracking-tight">SwapChat</span>
                        </div>
                        <nav className="hidden md:flex items-center gap-8">
                            <a href="#features" className="text-sm font-medium text-slate-400 hover:text-primary transition-colors">Features</a>
                            <a href="#security" className="text-sm font-medium text-slate-400 hover:text-primary transition-colors">Security</a>
                            <a href="#pricing" className="text-sm font-medium text-slate-400 hover:text-primary transition-colors">Pricing</a>
                            <a href="#testimonials" className="text-sm font-medium text-slate-400 hover:text-primary transition-colors">Testimonials</a>
                        </nav>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/login')}
                                className="hidden sm:block text-sm font-bold px-4 py-2 text-white hover:text-primary transition-colors"
                            >
                                Sign In
                            </button>
                            <button
                                onClick={() => navigate('/register')}
                                className="bg-primary hover:bg-primary/90 text-white text-sm font-bold py-2 px-5 rounded-lg transition-all shadow-lg shadow-primary/20"
                            >
                                Get Started
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main>
                {/* Hero Section */}
                <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-32">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10">
                        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]"></div>
                        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-primary/5 rounded-full blur-[100px]"></div>
                    </div>
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-6">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                            </span>
                            New: Version 2.0 is live
                        </div>
                        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400">
                            Communication, Reimagined <br className="hidden md:block" /> for Modern Teams.
                        </h1>
                        <p className="max-w-2xl mx-auto text-lg text-slate-400 mb-10 leading-relaxed">
                            Experience lightning-fast messaging with enterprise-grade security. Stay synced across all your devices, anywhere in the world.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
                            <button
                                onClick={() => navigate('/register')}
                                className="w-full sm:w-auto px-8 py-4 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl transition-all shadow-xl shadow-primary/25"
                            >
                                Download Now
                            </button>
                            <button className="w-full sm:w-auto px-8 py-4 bg-surface-dark border border-border-dark hover:border-primary/50 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined">play_circle</span>
                                Watch Demo
                            </button>
                        </div>
                        {/* Hero Image Showcase */}
                        <div className="relative max-w-5xl mx-auto">
                            <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-purple-500/30 rounded-2xl blur-2xl opacity-50"></div>
                            <div className="relative bg-surface-dark border border-border-dark rounded-2xl p-2 shadow-2xl">
                                <img
                                    alt="Chat Interface"
                                    className="rounded-xl w-full object-cover aspect-video shadow-inner"
                                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuB_aPEtc7H0wJ3b7DlMBW7FvnKmRMjFC5OySh3i_ipflADE231QTuH-th5J7ehCa6URw6eaVNl075AmwYhWEBcFTrYFs1ioo4ylQIt1w5hKwGWHEpvXa_FkTK2rin56A3It41eH8zP2kU_AsdWZnrcgi1_n0Bv83YwWU5fqeWpEguR8F59mRxQuhknuR6Xvf38KcFK7XfGqgnAWo-Um25qdnAMXVYCumOEXkaGGUMUt3GQNH0q97JB6-hs3tykzbld4zrXtlVJ2W00"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section id="features" className="py-24 bg-surface-dark/30">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16">
                            <h2 className="text-primary font-bold text-sm uppercase tracking-widest mb-3">Core Capabilities</h2>
                            <h3 className="text-3xl md:text-4xl font-black text-white">Engineered for speed and security</h3>
                            <p className="text-slate-400 mt-4 max-w-2xl mx-auto">Our platform provides the tools you need to stay connected without compromising on privacy or performance.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* Feature 1 */}
                            <div className="group p-8 rounded-2xl border border-border-dark bg-surface-dark hover:border-primary/50 transition-all duration-300">
                                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-3xl">shield_lock</span>
                                </div>
                                <h4 className="text-xl font-bold text-white mb-3">End-to-End Encryption</h4>
                                <p className="text-slate-400 leading-relaxed">Your privacy is our priority. Using state-of-the-art protocols, no one can read your messages but you and the recipient.</p>
                            </div>
                            {/* Feature 2 */}
                            <div className="group p-8 rounded-2xl border border-border-dark bg-surface-dark hover:border-primary/50 transition-all duration-300">
                                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-3xl">devices</span>
                                </div>
                                <h4 className="text-xl font-bold text-white mb-3">Multi-Device Support</h4>
                                <p className="text-slate-400 leading-relaxed">Seamlessly switch between desktop, mobile, and tablet. Your conversations are always waiting for you, exactly where you left off.</p>
                            </div>
                            {/* Feature 3 */}
                            <div className="group p-8 rounded-2xl border border-border-dark bg-surface-dark hover:border-primary/50 transition-all duration-300">
                                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-3xl">sync</span>
                                </div>
                                <h4 className="text-xl font-bold text-white mb-3">Real-time Sync</h4>
                                <p className="text-slate-400 leading-relaxed">Experience instant updates across all platforms with 99.9% uptime. Never miss a message with our ultra-low latency infrastructure.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Testimonials */}
                <section id="testimonials" className="py-24">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col md:flex-row items-end justify-between mb-12 gap-6">
                            <div className="max-w-xl">
                                <h2 className="text-primary font-bold text-sm uppercase tracking-widest mb-3">Trusted by teams</h2>
                                <h3 className="text-3xl md:text-4xl font-black text-white">Join thousands of companies scaling with SwipeChat</h3>
                            </div>
                            <div className="flex gap-2">
                                <button className="p-2 rounded-full border border-border-dark hover:border-primary/50 text-slate-400 hover:text-white transition-all">
                                    <span className="material-symbols-outlined">chevron_left</span>
                                </button>
                                <button className="p-2 rounded-full border border-border-dark hover:border-primary/50 text-slate-400 hover:text-white transition-all">
                                    <span className="material-symbols-outlined">chevron_right</span>
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {/* Testimonials would go here - simplified for brevity */}
                            <div className="bg-surface-dark p-8 rounded-2xl border border-border-dark relative overflow-hidden">
                                <span className="material-symbols-outlined absolute top-4 right-4 text-6xl text-white/5 select-none">format_quote</span>
                                <p className="text-slate-300 italic mb-8 relative z-10">"The encryption features alone make this the best choice for our remote development team. It's fast, secure, and the UI is beautiful."</p>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-slate-700"></div>
                                    <div>
                                        <h5 className="text-white font-bold">Alex Rivers</h5>
                                        <p className="text-slate-500 text-sm">CTO, TechFlow</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="py-20">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="bg-primary rounded-3xl p-8 md:p-16 text-center relative overflow-hidden shadow-2xl shadow-primary/40">
                            <div className="absolute top-0 right-0 p-12 -mr-20 -mt-20 bg-white/10 rounded-full w-96 h-96 blur-3xl"></div>
                            <div className="relative z-10">
                                <h2 className="text-3xl md:text-5xl font-black text-white mb-6">Ready to upgrade your team's workflow?</h2>
                                <p className="text-white/80 text-lg mb-10 max-w-2xl mx-auto">Join over 10,000 teams already using SwipeChat. Start your 14-day free trial today, no credit card required.</p>
                                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                    <button onClick={() => navigate('/register')} className="w-full sm:w-auto px-10 py-4 bg-white text-primary font-black rounded-xl hover:bg-slate-100 transition-all">
                                        Start Free Trial
                                    </button>
                                    <button className="w-full sm:w-auto px-10 py-4 bg-primary/20 text-white font-bold rounded-xl border border-white/30 hover:bg-primary/30 transition-all">
                                        Contact Sales
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="bg-background-dark border-t border-border-dark pt-16 pb-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 mb-16">
                        <div className="col-span-2 lg:col-span-2">
                            <div className="flex items-center gap-2 mb-6">
                                <img src={logo} alt="Logo" className="w-8 h-8" />
                                <span className="text-2xl font-bold tracking-tight text-white">SwapChat</span>
                            </div>
                            <p className="text-slate-400 max-w-sm mb-6">
                                Providing the most secure and reliable communication platform for modern distributed teams across the globe.
                            </p>
                        </div>
                    </div>
                    <div className="pt-8 border-t border-border-dark flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-slate-500 text-sm">© 2024 SwapChat Inc. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
