'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaMusic, FaSpotify, FaYoutube, FaLink, FaSearch, FaArrowLeft, FaPlus, FaSpinner } from 'react-icons/fa';
import { useTheme } from '@/contexts/ThemeContext';
import Image from 'next/image';

export default function AddJamModal({ isOpen, onClose, onAddJam }) {
  const { theme, currentTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  
  // View State: 'search' (default) or 'form' (editing/manual)
  const [view, setView] = useState('search'); 
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSource, setSearchSource] = useState('spotify'); 
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Form Data
  const [formData, setFormData] = useState({
    title: '',
    artist: '',
    link: '',
    note: '',
    thumbnail: '',
    releaseDate: '' // Stores full date string or year
  });

  const getLinkType = (link) => {
    if (!link) return 'other';
    if (link.includes('spotify.com')) return 'spotify';
    if (link.includes('youtube.com') || link.includes('youtu.be')) return 'youtube';
    return 'other';
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchResults([]); 

    try {
      const res = await fetch('/api/search-jams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, type: searchSource }),
      });
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error("Search failed", error);
    } finally {
      setIsSearching(false);
    }
  };

  const selectSong = (song) => {
    setFormData({
      title: song.title,
      artist: song.artist,
      link: song.link,
      thumbnail: song.thumbnail,
      releaseDate: song.releaseDate || '', // Capture date from API
      note: ''
    });
    setView('form'); 
  };

  const startManualEntry = () => {
    setFormData({ title: '', artist: '', link: '', note: '', thumbnail: '', releaseDate: '' });
    setView('form');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.artist.trim() || !formData.link.trim()) return;

    setLoading(true);
    try {
      const type = getLinkType(formData.link);
      await onAddJam({ ...formData, type });
      
      setFormData({ title: '', artist: '', link: '', note: '', thumbnail: '', releaseDate: '' });
      setSearchQuery('');
      setSearchResults([]);
      setView('search');
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const LinkIcon = getLinkType(formData.link) === 'spotify' ? FaSpotify :
                   getLinkType(formData.link) === 'youtube' ? FaYoutube : FaLink;
  
  const linkColor = getLinkType(formData.link) === 'spotify' ? 'text-green-500' :
                    getLinkType(formData.link) === 'youtube' ? 'text-red-500' : 'text-gray-400';

  const inputStyle = `w-full px-4 py-3 rounded-xl border-2 focus:outline-none font-bold ${
    currentTheme === 'dark' 
      ? 'bg-gray-900 border-gray-700 text-white focus:border-purple-500' 
      : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-purple-500'
  }`;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.9 }}
            onClick={(e) => e.stopPropagation()}
            className={`${theme.colors.bgCard} rounded-3xl p-6 max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border ${theme.colors.border}`}
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h2 className="text-2xl font-bold gradient-text flex items-center gap-2">
                <FaMusic /> {view === 'search' ? 'Post a Jam' : 'Add Details'}
              </h2>
              
              <div className="flex items-center gap-2">
                 {view === 'form' && (
                    <button 
                        onClick={() => setView('search')} 
                        className={`p-2 rounded-full transition-colors ${currentTheme === 'dark' ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                        title="Back to Search"
                    >
                        <FaArrowLeft size={18} />
                    </button>
                 )}
                 <button onClick={onClose} className={`p-2 rounded-full transition-colors ${currentTheme === 'dark' ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                    <FaTimes size={20} />
                 </button>
              </div>
            </div>

            {/* --- VIEW 1: SEARCH --- */}
            {view === 'search' && (
              <div className="flex flex-col h-full overflow-hidden">
                
                {/* Source Selector */}
                <div className={`${currentTheme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'} p-1 rounded-xl flex mb-4 shrink-0`}>
                    <button
                        type="button"
                        onClick={() => setSearchSource('spotify')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-sm transition-all ${
                            searchSource === 'spotify' 
                            ? `${currentTheme === 'dark' ? 'bg-gray-700 text-white' : 'bg-white text-green-600'} shadow-sm` 
                            : 'text-gray-500 hover:text-gray-400'
                        }`}
                    >
                        <FaSpotify size={18} /> Spotify
                    </button>
                    <button
                        type="button"
                        onClick={() => setSearchSource('youtube')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-sm transition-all ${
                            searchSource === 'youtube' 
                            ? `${currentTheme === 'dark' ? 'bg-gray-700 text-white' : 'bg-white text-red-600'} shadow-sm` 
                            : 'text-gray-500 hover:text-gray-400'
                        }`}
                    >
                        <FaYoutube size={18} /> YouTube
                    </button>
                </div>

                {/* Search Bar */}
                <form onSubmit={handleSearch} className="flex gap-2 mb-4 shrink-0">
                  <div className="relative flex-1">
                    <FaSearch className="absolute left-3 top-3.5 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={`Search ${searchSource === 'spotify' ? 'Spotify' : 'YouTube'}...`}
                        className={inputStyle + " pl-10 pr-10"}
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearchQuery('');
                                setSearchResults([]);
                            }}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                        >
                            <FaTimes />
                        </button>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={isSearching || !searchQuery.trim()}
                    className={`px-4 rounded-xl font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center shadow-lg ${
                        searchSource === 'spotify' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {isSearching ? <FaSpinner className="animate-spin" /> : <FaSearch />}
                  </button>
                </form>

                {/* Results List */}
                <div className="overflow-y-auto custom-scrollbar grow -mx-2 px-2">
                    {searchResults.length === 0 && !isSearching && searchQuery && (
                        <div className="text-center py-8 text-gray-400">
                            No results found. Try manual entry below.
                        </div>
                    )}
                    
                    <div className="space-y-2 pb-2">
                        {searchResults.map((result) => (
                        <div
                            key={result.id}
                            onClick={() => selectSong(result)}
                            className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-colors group border border-transparent ${
                                currentTheme === 'dark' 
                                ? 'hover:bg-gray-800 hover:border-gray-700' 
                                : 'hover:bg-gray-50 hover:border-gray-200'
                            }`}
                        >
                            <Image src={result.thumbnail} alt="art" width={48} height={48} className="w-12 h-12 rounded-md object-cover bg-gray-200" />
                            <div className="flex-1 min-w-0">
                                <p className={`font-bold truncate ${theme.colors.text}`}>{result.title}</p>
                                <p className="text-xs text-gray-500 truncate">
                                    {result.artist} {result.releaseDate && `(${result.releaseDate.substring(0,4)})`}
                                </p>
                            </div>
                            <div className="text-purple-500 opacity-0 group-hover:opacity-100 text-sm font-bold pr-2">
                                Select
                            </div>
                        </div>
                        ))}
                    </div>
                </div>

                {/* Manual Entry Trigger */}
                <div className={`pt-4 mt-2 border-t shrink-0 ${currentTheme === 'dark' ? 'border-gray-800' : 'border-gray-100'}`}>
                    <p className="text-sm font-bold text-gray-500 mb-2">Or, Add Manually:</p>
                    <button
                        onClick={startManualEntry}
                        className={`w-full py-3 rounded-xl border-2 border-dashed font-bold transition-all flex items-center justify-center gap-2 ${
                            currentTheme === 'dark'
                            ? 'border-gray-700 text-gray-400 hover:border-purple-500 hover:text-purple-400'
                            : 'border-gray-300 text-gray-500 hover:border-purple-500 hover:text-purple-600'
                        }`}
                    >
                        <FaPlus /> Enter Song Details
                    </button>
                </div>
              </div>
            )}

            {/* --- VIEW 2: EDIT FORM --- */}
            {view === 'form' && (
              <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-y-auto custom-scrollbar">
                
                {/* Preview Image */}
                {formData.thumbnail && (
                    <div className="flex justify-center mb-6">
                      <div className="relative">
                        <Image src={formData.thumbnail} alt="Selected" width={128} height={128} className="w-32 h-32 rounded-xl shadow-lg object-cover" />
                        <div className={`absolute -bottom-2 -right-2 rounded-full p-2 shadow-md ${currentTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
                            {formData.link.includes('spotify') ? <FaSpotify className="text-green-500 text-xl"/> : <FaYoutube className="text-red-500 text-xl"/>}
                        </div>
                      </div>
                    </div>
                )}

                <div className="space-y-4 grow">
                    <div>
                        <label className={`block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1`}>Song Title</label>
                        <input
                            type="text"
                            required
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className={inputStyle}
                            placeholder="e.g. Bohemian Rhapsody"
                        />
                    </div>

                    {/* Artist & Year Row */}
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className={`block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1`}>Artist</label>
                            <input
                                type="text"
                                required
                                value={formData.artist}
                                onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
                                className={inputStyle}
                                placeholder="e.g. Queen"
                            />
                        </div>
                        {/* NEW YEAR INPUT */}
                        <div className="w-1/3">
                            <label className={`block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1`}>Year</label>
                            <input
                                type="text"
                                value={formData.releaseDate ? formData.releaseDate.substring(0,4) : ''}
                                onChange={(e) => setFormData({ ...formData, releaseDate: e.target.value })}
                                className={inputStyle}
                                placeholder="2025"
                                maxLength={4}
                            />
                        </div>
                    </div>

                    <div>
                        <label className={`block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1`}>Link</label>
                        <div className="relative">
                            <input
                                type="url"
                                required
                                value={formData.link}
                                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                                className={inputStyle + " pl-10"}
                                placeholder="https://..."
                            />
                            <LinkIcon className={`absolute left-3 top-3.5 ${linkColor}`} size={18} />
                        </div>
                    </div>

                    <div>
                        <label className={`block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1`}>Note (Optional)</label>
                        <textarea
                            value={formData.note}
                            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                            className={inputStyle}
                            rows={3}
                            placeholder="Why do you love this song?"
                        />
                    </div>
                </div>

                <div className="pt-6 shrink-0">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-bold hover:shadow-lg hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading ? 'Posting...' : 'Post Jam'}
                    </button>
                </div>
              </form>
            )}

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
