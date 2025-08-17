import { Link } from 'react-router-dom';

const Maintenance = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white p-6">
      <div className="max-w-xl text-center">
        <h1 className="text-2xl font-bold mb-4">StudyReels is temporarily closed for upgrades</h1>
        <p className="mb-4 text-slate-300">Upgrading the app to bring you a better experience. Please check back soon.</p>
        <p className="mb-6 text-sm text-slate-400">Follow progress on <a href="https://github.com/Amrit-Nigam" target="_blank" rel="noopener noreferrer" className="text-purple-300 underline">GitHub</a>.</p>
        <div>
          <Link to="/" className="inline-block px-4 py-2 bg-purple-600 text-white rounded">Back to Home</Link>
        </div>
      </div>
    </div>
  );
};

export default Maintenance;
