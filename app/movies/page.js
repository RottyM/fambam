'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useMovies } from '@/hooks/useFirestore';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import UserAvatar from '@/components/UserAvatar';
import { motion, AnimatePresence } from 'framer-motion';
import { FaFilm, FaPlus, FaCheck, FaTrash, FaRandom, FaHeart, FaSearch, FaTimes, FaSpinner, FaList, FaTh } from 'react-icons/fa';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import Image from 'next/image';
import { useFamilyActions } from '@/hooks/useFamilyActions';

// --- AddMovieModal Component ---
// (This component is unchanged from previous versions)
function AddMovieModal({ showModal, setShowModal, addMovie, searchMovies, getMovieDetails, searchLoading }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [manualTitle, setManualTitle] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isAddingMovie, setIsAddingMovie] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const { results } = await searchMovies(searchQuery);
      setSearchResults(results);
    } catch (error) {
      toast.error('Search failed. Check your TMDB key or network connection.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddFromSearch = async (movie) => {
    setIsAddingMovie(true);
    try {
      const details = await getMovieDetails(movie.id);

      await addMovie({
        title: movie.title,
        overview: movie.overview,
        releaseDate: movie.releaseDate,
        posterUrl: movie.posterUrl,
        rating: movie.rating,
        tmdbId: movie.id,
        genres: details.genres,
        runtime: details.runtime,
        tagline: details.tagline,
        certification: details.certification,
        director: details.director,
        screenplay: details.screenplay,
        streamingProviders: details.streamingProviders,
        rentProviders: details.rentProviders,
        buyProviders: details.buyProviders,
        watchLink: details.watchLink,
        trailerKey: details.trailerKey,
      });
      setShowModal(false);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      toast.error('Failed to add movie. Please try again.');
    } finally {
      setIsAddingMovie(false);
    }
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

            {searchResults.length > 0 && (
              <div className="space-y-3 mb-6 border-t pt-4">
                <h3 className="text-lg font-bold text-gray-700">Results:</h3>
                {searchResults.map(movie => (
                  <div
                    key={movie.id}
                    className={`flex gap-3 p-3 bg-gray-50 rounded-xl items-center transition-colors ${
                      isAddingMovie ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-100'
                    }`}
                    onClick={() => !isAddingMovie && handleAddFromSearch(movie)}
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


// --- Main Content Component ---
function MoviesContent() {
  const { movies, loading, addMovie, toggleWatched, toggleVote, deleteMovie } = useMovies();
  const { searchMovies, getMovieDetails, loading: searchLoading } = useFamilyActions(); 
  
  const { user } = useAuth();
  const { getMemberById } = useFamily();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [winningMovie, setWinningMovie] = useState(null);
  const [view, setView] = useState('active');
  const [viewMode, setViewMode] = useState('detail');

  // --- NEW STATE: Track which trailer key is currently playing ---
  const [trailerKeyToPlay, setTrailerKeyToPlay] = useState(null);

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
        {/* Add Movie Button */}
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-2xl font-bold hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg flex items-center gap-2"
        >
          <FaPlus /> <span className="hidden md:inline">Add Movie</span>
        </button>
      </div>

      {/* Filters, Randomizer & View Mode Toggle */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div className="flex items-center gap-3 overflow-x-auto custom-scrollbar pb-2 pt-1 px-1">
          <div className="flex gap-3 shrink-0">
            <button
              onClick={() => setView('active')}
              className={`flex items-center gap-2 px-4 md:px-5 py-2 md:py-3 rounded-full border-2 transition-all shadow-sm whitespace-nowrap text-sm md:text-base ${
                view === 'active'
                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                  : 'border-dashed border-gray-300 bg-white text-gray-700 hover:border-purple-300'
              }`}
            >
              Watchlist ({activeMovies.length})
            </button>
            <button
              onClick={() => setView('watched')}
              className={`flex items-center gap-2 px-4 md:px-5 py-2 md:py-3 rounded-full border-2 transition-all shadow-sm whitespace-nowrap text-sm md:text-base ${
                view === 'watched'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-dashed border-gray-300 bg-white text-gray-700 hover:border-green-300'
              }`}
            >
              Watched ({watchedMovies.length})
            </button>

            {view === 'active' && activeMovies.length > 0 && (
              <button
                onClick={pickRandomMovie}
                className="flex items-center gap-2 px-4 md:px-5 py-2 md:py-3 rounded-full border-2 border-yellow-400 bg-yellow-50 text-yellow-900 font-bold shadow-sm whitespace-nowrap hover:bg-yellow-100 transition-all"
              >
                <FaRandom /> <span className="hidden sm:inline">Spin</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto custom-scrollbar pb-2 pt-1 px-1 md:justify-end">
          <div className="flex gap-3 shrink-0">
            <button
              onClick={() => setViewMode('detail')}
              className={`flex items-center gap-2 px-4 md:px-5 py-2 md:py-3 rounded-full border-2 transition-all shadow-sm whitespace-nowrap text-sm md:text-base ${
                viewMode === 'detail'
                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                  : 'border-dashed border-gray-300 bg-white text-gray-700 hover:border-purple-300'
              }`}
              title="Detail View"
            >
              <FaList /> Detail View
            </button>
            <button
              onClick={() => setViewMode('poster')}
              className={`flex items-center gap-2 px-4 md:px-5 py-2 md:py-3 rounded-full border-2 transition-all shadow-sm whitespace-nowrap text-sm md:text-base ${
                viewMode === 'poster'
                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                  : 'border-dashed border-gray-300 bg-white text-gray-700 hover:border-purple-300'
              }`}
              title="Poster View"
            >
              <FaTh /> Poster Grid
            </button>
          </div>
        </div>
      </div>

      {/* Movie Grid */}
      <div className={`grid gap-6 ${viewMode === 'poster' ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5' : 'grid-cols-1 md:grid-cols-2'}`}>
        <AnimatePresence>
          {displayedMovies.map((movie) => {
            const uploader = getMemberById(movie.addedBy);
            const hasVoted = movie.votes?.includes(user?.uid);
            const voteCount = movie.votes?.length || 0;
            const year = movie.releaseDate ? movie.releaseDate.substring(0, 4) : '';
            const userScore = movie.rating ? Math.round(movie.rating * 10) : null;

            const formatRuntime = (minutes) => {
              if (!minutes) return null;
              const hours = Math.floor(minutes / 60);
              const mins = minutes % 60;
              return `${hours}h ${mins}m`;
            };

            if (viewMode === 'poster') {
              // --- POSTER-ONLY VIEW ("DECISION MODE") ---
              return (
                <motion.div
                  key={movie.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="relative group"
                >
                  <div className="aspect-[2/3] relative rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all">
                    {movie.posterUrl ? (
                      <Image
                        src={movie.posterUrl}
                        alt={movie.title}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-400">No Poster</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                      <h3 className="text-white font-bold truncate">{movie.title}</h3>
                      {year && <p className="text-gray-300 text-sm">{year}</p>}
                    </div>

                    <div className="absolute top-2 right-2 flex flex-col gap-1">
                      {!movie.watched && (
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleVote(movie.id, movie.votes); }}
                          className={`p-1.5 rounded-full shadow-sm transition-all ${
                            hasVoted ? 'bg-red-500 text-white' : 'bg-white/80 text-gray-500 hover:bg-red-500 hover:text-white'
                          }`}
                          title="Vote"
                        >
                          <FaHeart size={14} className={hasVoted ? 'fill-current' : ''} />
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleWatched(movie.id, movie.watched); }}
                        className={`p-1.5 rounded-full shadow-sm transition-all ${
                           movie.watched ? 'bg-green-500 text-white' : 'bg-white/80 text-gray-500 hover:bg-green-500 hover:text-white'
                        }`}
                        title={movie.watched ? "Mark as unwatched" : "Mark as watched"}
                      >
                        <FaCheck size={14} />
                      </button>
                    </div>
                  </div>
                  {voteCount > 0 && !movie.watched && (
                    <div className="absolute -bottom-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-sm z-10">
                      {voteCount}
                    </div>
                  )}
                </motion.div>
              );
            } else {
              // --- SIMPLIFIED DETAIL VIEW ---
              return (
                <motion.div
                  key={movie.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all border-2 border-transparent hover:border-purple-100 overflow-hidden relative"
                >
                  <button
                    onClick={() => deleteMovie(movie.id)}
                    className="absolute top-3 right-3 z-10 bg-white/90 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors p-2 rounded-full shadow-md"
                  >
                    <FaTrash size={14} />
                  </button>

                  <div className="flex flex-col sm:flex-row h-full">
                    {movie.posterUrl && (
                      <div className="flex-shrink-0 w-full sm:w-[200px] h-[300px] relative">
                        <Image
                          src={movie.posterUrl}
                          alt={movie.title}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    )}

                    <div className="flex-1 p-5 flex flex-col">
                      <h3 className="text-2xl font-bold text-gray-800 mb-2">
                        {movie.title} {year && <span className="text-gray-500">({year})</span>}
                      </h3>

                      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 mb-3">
                        {movie.certification && (
                          <span className="border border-gray-400 px-1.5 py-0.5 rounded text-xs font-semibold">
                            {movie.certification}
                          </span>
                        )}
                        {movie.releaseDate && (
                          <span>{movie.releaseDate}</span>
                        )}
                        {movie.genres && movie.genres.length > 0 && (
                          <>
                            <span>•</span>
                            <span>{movie.genres.join(', ')}</span>
                          </>
                        )}
                        {movie.runtime && (
                          <>
                            <span>•</span>
                            <span>{formatRuntime(movie.runtime)}</span>
                          </>
                        )}
                      </div>

                      {userScore && (
                        <div className="flex items-center gap-2 mb-3">
                          <div className="relative w-12 h-12">
                            <svg className="transform -rotate-90 w-12 h-12">
                              <circle cx="24" cy="24" r="20" stroke="#e5e7eb" strokeWidth="4" fill="none" />
                              <circle cx="24" cy="24" r="20" stroke="#22c55e" strokeWidth="4" fill="none" strokeDasharray={`${userScore * 1.256} 125.6`} strokeLinecap="round" />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                              {userScore}%
                            </div>
                          </div>
                          <span className="text-sm font-semibold text-gray-700">User Score</span>
                        </div>
                      )}

                      {movie.tagline && (
                        <p className="text-sm italic text-gray-500 mb-3">{movie.tagline}</p>
                      )}
                      <div className="mb-3 flex-1">
                        <p className="text-sm text-gray-600 line-clamp-4">{movie.overview}</p>
                      </div>

                      {/* --- MODAL TRIGGER: Play Trailer Button --- */}
                      {movie.trailerKey && (
                        <div className="flex gap-2 mb-3 mt-auto">
                          <button
                            // Clicking sets the state to this movie's key, opens modal
                            onClick={() => setTrailerKeyToPlay(movie.trailerKey)}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold text-sm text-center transition-colors flex items-center justify-center gap-2"
                          >
                            ▶ Play Trailer
                          </button>
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-3 pt-3 border-t">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <UserAvatar user={uploader} size={20} />
                          <span className="truncate">{uploader?.displayName?.split(' ')[0]}</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => toggleWatched(movie.id, movie.watched)}
                            className={`p-2 rounded-full transition-colors ${
                              movie.watched ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400 hover:bg-green-50 hover:text-green-500'
                            }`}
                            title={movie.watched ? "Mark as unwatched" : "Mark as watched"}
                          >
                            <FaCheck />
                          </button>

                          {!movie.watched && (
                            <button
                              onClick={() => toggleVote(movie.id, movie.votes)}
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-full font-bold transition-all ${
                                hasVoted ? 'bg-red-50 text-red-500 ring-2 ring-red-100' : 'bg-gray-50 text-gray-500 hover:bg-red-50 hover:text-red-400'
                              }`}
                            >
                              <FaHeart className={hasVoted ? 'fill-current' : ''} />
                              <span>{voteCount}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            }
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
        getMovieDetails={getMovieDetails}
        searchLoading={searchLoading}
      />

      {/* Winner Modal */}
      <AnimatePresence>
        {showWinnerModal && winningMovie && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          >
            {/* ... (Winner Modal content unchanged) ... */}
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
                    // If the winner has a trailer, play it immediately when they accept
                    if (winningMovie.trailerKey) {
                        setTrailerKeyToPlay(winningMovie.trailerKey);
                    }
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
                    setTimeout(pickRandomMovie, 300); 
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

      {/* --- NEW: YouTube Trailer Modal --- */}
      <AnimatePresence>
        {trailerKeyToPlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            // Clicking the background backdrop closes the modal
            onClick={() => setTrailerKeyToPlay(null)}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          >
            {/* Video Container (Aspect Ratio 16:9) */}
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              // Stop propagation so clicking inside the video container doesn't close it
              onClick={(e) => e.stopPropagation()}
              className="bg-black rounded-2xl overflow-hidden shadow-2xl w-full max-w-4xl relative aspect-video"
            >
                {/* Close Button */}
                <button
                   onClick={() => setTrailerKeyToPlay(null)}
                   className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/50 rounded-full p-2 z-10 transition-colors"
                >
                   <FaTimes size={24} />
                </button>

                {/* YouTube Embed Iframe */}
                <iframe
                  width="100%"
                  height="100%"
                  // Use the state key to load the video, autoplay=1 starts it immediately
                  src={`https://www.youtube.com/embed/${trailerKeyToPlay}?autoplay=1&rel=0`}
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="absolute inset-0"
                ></iframe>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// --- Main Page Export ---
export default function MoviesPage() {
  return (
    <DashboardLayout>
      <MoviesContent />
    </DashboardLayout>
  );
}
