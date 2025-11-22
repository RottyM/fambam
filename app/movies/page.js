'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useMovies } from '@/hooks/useFirestore';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import UserAvatar from '@/components/UserAvatar';
import { motion, AnimatePresence } from 'framer-motion';
import { FaFilm, FaPlus, FaCheck, FaTrash, FaRandom, FaHeart, FaSearch, FaTimes, FaSpinner } from 'react-icons/fa';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import Image from 'next/image';
import { useFamilyActions } from '@/hooks/useFamilyActions';
// --- D&D Imports REMOVED (The source of the compilation crash) ---


function AddMovieModal({ showModal, setShowModal, addMovie, searchMovies, searchLoading }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [manualTitle, setManualTitle] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const { results } = await searchMovies(searchQuery); 
      setSearchResults(results);
    } catch (error) {
      // The error is handled by the hook, but we catch locally to reset state
      toast.error('Search failed. Check your TMDB key or network connection.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddFromSearch = async (movie) => {
    await addMovie({
      title: movie.title,
      overview: movie.overview,
      releaseDate: movie.releaseDate,
      posterUrl: movie.posterUrl,
      rating: movie.rating,
      tmdbId: movie.id,
    });
    setShowModal(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleAddManual = async (e) => {
    e.preventDefault();
    if (!manualTitle.trim()) return;
    
    await addMovie({
      title: manualTitle,
      description: 'Manually added movie.',
    });
    setShowModal(false);
    setManualTitle('');
  };

  return (
    <AnimatePresence>
      {showModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.9 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl max-h-[95vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold gradient-text flex items-center gap-2">
                    <FaFilm /> Add a Movie
                </h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                    <FaTimes size={20} />
                </button>
            </div>

            {/* --- TMDB Search Section --- */}
            <form onSubmit={handleSearch} className="flex gap-2 mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for a movie..."
                className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none font-medium"
              />
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="bg-purple-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-purple-600 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isSearching ? <FaSpinner className="animate-spin" /> : <FaSearch />}
              </button>
            </form>

            {/* --- Search Results --- */}
            {searchResults.length > 0 && (
              <div className="space-y-3 mb-6 border-t pt-4">
                <h3 className="text-lg font-bold text-gray-700">Results:</h3>
                {searchResults.map(movie => (
                  <div 
                    key={movie.id} 
                    className="flex gap-3 p-3 bg-gray-50 rounded-xl items-center cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleAddFromSearch(movie)}
                  >
                    <Image
                      src={movie.posterUrl || 'https://placehold.co/60x90/cccccc/000?text=No+Poster'}
                      alt={movie.title}
                      width={40}
                      height={60}
                      className="rounded-md object-cover flex-shrink-0"
                      unoptimized
                    />
                    <div className='flex-1 min-w-0'>
                        <p className="font-bold text-gray-800 truncate">{movie.title}</p>
                        <p className="text-sm text-gray-500">{movie.releaseDate?.substring(0, 4)}</p>
                    </div>
                    <FaPlus className='text-purple-500 flex-shrink-0' />
                  </div>
                ))}
              </div>
            )}
            
            {/* --- Manual Entry Fallback --- */}
            <div className="border-t pt-4">
                <h3 className="text-lg font-bold text-gray-700 mb-3">Or, Add Manually:</h3>
                <form onSubmit={handleAddManual} className="flex gap-2">
                    <input
                        type="text"
                        value={manualTitle}
                        onChange={(e) => setManualTitle(e.target.value)}
                        placeholder="Type movie title here"
                        className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none font-medium"
                        required
                    />
                    <button
                        type="submit"
                        disabled={!manualTitle.trim()}
                        className="bg-green-500 text-white px-4 py-3 rounded-xl font-bold hover:bg-green-600 transition-all disabled:opacity-50 flex items-center justify-center"
                    >
                        <FaPlus />
                    </button>
                </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


function MoviesContent() {
  const { movies, loading, addMovie, toggleWatched, toggleVote, deleteMovie } = useMovies();
  const { searchMovies, loading: searchLoading } = useFamilyActions(); 
  
  const { user } = useAuth();
  const { getMemberById } = useFamily();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [winningMovie, setWinningMovie] = useState(null);
  const [view, setView] = useState('active'); // 'active' or 'watched'

  const activeMovies = movies.filter(m => !m.watched);
  const watchedMovies = movies.filter(m => m.watched);
  const displayedMovies = view === 'active' ? activeMovies : watchedMovies;

  const pickRandomMovie = () => {
    if (activeMovies.length === 0) {
      toast.error('No movies to pick from!');
      return;
    }

    let weightedList = [];
    activeMovies.forEach(movie => {
      weightedList.push(movie); 
      if (movie.votes) {
        for (let i = 0; i < movie.votes.length; i++) {
          weightedList.push(movie); 
        }
      }
    });

    const spinDuration = 2000;
    const intervalTime = 100;
    const startTime = Date.now();

    const shuffleInterval = setInterval(() => {
      const randomPreview = activeMovies[Math.floor(Math.random() * activeMovies.length)];
      setWinningMovie(randomPreview);
      setShowWinnerModal(true);

      if (Date.now() - startTime > spinDuration) {
        clearInterval(shuffleInterval);
        const winner = weightedList[Math.floor(Math.random() * weightedList.length)];
        setWinningMovie(winner);
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    }, intervalTime);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🍿</div>
          <p className="text-xl font-bold text-purple-600">Loading movies...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-display font-bold mb-2">
            <span className="gradient-text">Movie Night</span> 🎬
          </h1>
          <p className="text-gray-600 font-semibold">
            Vote on what to watch next!
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-2xl font-bold hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg flex items-center gap-2"
        >
          <FaPlus /> <span className="hidden md:inline">Add Movie</span>
        </button>
      </div>

      {/* Tabs & Randomizer */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
        <div className="bg-white p-1 rounded-xl shadow-sm flex">
          <button
            onClick={() => setView('active')}
            className={`px-6 py-2 rounded-lg font-bold transition-all ${
              view === 'active' ? 'bg-purple-100 text-purple-600' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            Watchlist ({activeMovies.length})
          </button>
          <button
            onClick={() => setView('watched')}
            className={`px-6 py-2 rounded-lg font-bold transition-all ${
              view === 'watched' ? 'bg-green-100 text-green-600' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            Watched ({watchedMovies.length})
          </button>
        </div>

        {view === 'active' && activeMovies.length > 0 && (
          <button
            onClick={pickRandomMovie}
            className="bg-yellow-400 text-yellow-900 px-6 py-3 rounded-xl font-bold hover:bg-yellow-300 transition-all shadow-lg flex items-center gap-2 w-full md:w-auto justify-center"
          >
            <FaRandom /> Spin the Wheel!
          </button>
        )}
      </div>

      {/* Movie Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {displayedMovies.map((movie) => {
            const uploader = getMemberById(movie.addedBy);
            const hasVoted = movie.votes?.includes(user.uid);
            const voteCount = movie.votes?.length || 0;

            return (
              <motion.div
                key={movie.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-2xl p-5 shadow-md hover:shadow-lg transition-all border-2 border-transparent hover:border-purple-100"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-xl font-bold text-gray-800 line-clamp-2">{movie.title}</h3>
                  <button
                    onClick={() => deleteMovie(movie.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors p-1"
                  >
                    <FaTrash size={14} />
                  </button>
                </div>
                
                {/* Movie Poster & Description */}
                {movie.posterUrl && (
                    <Image 
                        src={movie.posterUrl} 
                        alt={movie.title} 
                        width={100} 
                        height={150} 
                        className="rounded-lg object-cover mb-4 shadow-md" 
                        unoptimized
                    />
                )}
                <p className="text-sm text-gray-600 line-clamp-3 mb-4">{movie.overview}</p>
                <p className="text-xs text-gray-400 mb-2">Release: {movie.releaseDate}</p>


                <div className="flex items-center justify-between mt-4 border-t pt-3">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>Added by</span>
                    <UserAvatar user={uploader} size={20} />
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Watched Toggle */}
                    <button
                      onClick={() => toggleWatched(movie.id, movie.watched)}
                      className={`p-2 rounded-full transition-colors ${
                        movie.watched 
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-gray-100 text-gray-400 hover:bg-green-50 hover:text-green-500'
                      }`}
                      title={movie.watched ? "Mark as unwatched" : "Mark as watched"}
                    >
                      <FaCheck />
                    </button>

                    {/* Vote Button (Only for active movies) */}
                    {!movie.watched && (
                      <button
                        onClick={() => toggleVote(movie.id, movie.votes)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-full font-bold transition-all ${
                          hasVoted
                            ? 'bg-red-50 text-red-500 ring-2 ring-red-100'
                            : 'bg-gray-50 text-gray-500 hover:bg-red-50 hover:text-red-400'
                        }`}
                      >
                        <FaHeart className={hasVoted ? 'fill-current' : ''} />
                        <span>{voteCount}</span>
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {displayedMovies.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <div className="text-6xl mb-4">🍿</div>
          <p>No movies found. Add one to get started!</p>
        </div>
      )}

      <AddMovieModal 
        showModal={showAddModal} 
        setShowModal={setShowAddModal} 
        addMovie={addMovie} 
        searchMovies={searchMovies} 
        searchLoading={searchLoading}
      />

      {/* Winner Modal (kept the original structure) */}
      <AnimatePresence>
        {showWinnerModal && winningMovie && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.5, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl border-4 border-yellow-400"
            >
              <div className="text-6xl mb-4 animate-bounce">🏆</div>
              <h2 className="text-xl font-bold text-gray-500 uppercase tracking-wider mb-2">Tonight we watch</h2>
              <h1 className="text-4xl font-display font-black gradient-text mb-6">
                {winningMovie.title}
              </h1>
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setShowWinnerModal(false);
                    setWinningMovie(null);
                  }}
                  className="bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-gray-800"
                >
                  Let's Watch It! 🍿
                </button>
                <button
                  onClick={() => {
                    setShowWinnerModal(false);
                    setWinningMovie(null);
                    setTimeout(pickRandomMovie, 300); // Spin again
                  }}
                  className="text-gray-500 font-semibold hover:text-gray-800"
                >
                  Spin Again 🔄
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function MoviesPage() {
  return (
    <DashboardLayout>
      <MoviesContent />
    </DashboardLayout>
  );
}