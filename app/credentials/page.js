'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useCredentials } from '@/hooks/useFirebase';
import { useFamily } from '@/contexts/FamilyContext';
import { useTheme } from '@/contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlus, FaTimes, FaEdit, FaTrash, FaEye, FaEyeSlash, FaExternalLinkAlt, FaCopy, FaLock } from 'react-icons/fa';
import toast from 'react-hot-toast';

const CATEGORIES = [
  { value: 'school', label: 'School', icon: '🏫', color: 'bg-blue-100 border-blue-300' },
  { value: 'library', label: 'Library', icon: '📚', color: 'bg-purple-100 border-purple-300' },
  { value: 'medical', label: 'Medical', icon: '🏥', color: 'bg-red-100 border-red-300' },
  { value: 'utilities', label: 'Utilities', icon: '💡', color: 'bg-yellow-100 border-yellow-300' },
  { value: 'entertainment', label: 'Entertainment', icon: '🎬', color: 'bg-pink-100 border-pink-300' },
  { value: 'banking', label: 'Banking', icon: '🏦', color: 'bg-green-100 border-green-300' },
  { value: 'other', label: 'Other', icon: '📌', color: 'bg-gray-100 border-gray-300' },
];

function CredentialCard({ credential, onEdit, onDelete, isParent }) {
  const [showPassword, setShowPassword] = useState(false);
  const category = CATEGORIES.find(c => c.value === credential.category) || CATEGORIES[CATEGORIES.length - 1];

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard! 📋`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`${category.color} border-2 rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-3xl flex-shrink-0">{category.icon}</span>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-lg truncate">{credential.name}</h3>
            <span className="text-xs font-semibold text-gray-600 bg-white/50 px-2 py-1 rounded-full">
              {category.label}
            </span>
          </div>
        </div>
        {isParent && (
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => onEdit(credential)}
              className="text-blue-600 hover:text-blue-800 p-2 hover:bg-white/50 rounded-lg transition-all"
              title="Edit"
            >
              <FaEdit size={16} />
            </button>
            <button
              onClick={() => {
                if (confirm(`Delete "${credential.name}"?`)) {
                  onDelete(credential.id);
                }
              }}
              className="text-red-600 hover:text-red-800 p-2 hover:bg-white/50 rounded-lg transition-all"
              title="Delete"
            >
              <FaTrash size={16} />
            </button>
          </div>
        )}
      </div>

      {credential.websiteUrl && (
        <div className="mb-3">
          <a
            href={credential.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-2 hover:underline"
          >
            <FaExternalLinkAlt /> {credential.websiteUrl}
          </a>
        </div>
      )}

      <div className="space-y-2">
        {credential.username && (
          <div className="bg-white/70 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-600 mb-1">Username</p>
                <p className="text-sm font-bold text-gray-900 truncate">{credential.username}</p>
              </div>
              <button
                onClick={() => copyToClipboard(credential.username, 'Username')}
                className="text-gray-600 hover:text-gray-900 p-2 hover:bg-white rounded-lg transition-all flex-shrink-0"
                title="Copy username"
              >
                <FaCopy size={14} />
              </button>
            </div>
          </div>
        )}

        {credential.password && (
          <div className="bg-white/70 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-600 mb-1">Password</p>
                <p className="text-sm font-bold text-gray-900 font-mono truncate">
                  {showPassword ? credential.password : '••••••••'}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-600 hover:text-gray-900 p-2 hover:bg-white rounded-lg transition-all"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                </button>
                <button
                  onClick={() => copyToClipboard(credential.password, 'Password')}
                  className="text-gray-600 hover:text-gray-900 p-2 hover:bg-white rounded-lg transition-all"
                  title="Copy password"
                >
                  <FaCopy size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {credential.notes && (
          <div className="bg-white/70 rounded-xl p-3">
            <p className="text-xs font-semibold text-gray-600 mb-1">Notes</p>
            <p className="text-sm text-gray-700">{credential.notes}</p>
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-300/50">
        <p className="text-xs text-gray-600">
          Last updated: {credential.updatedAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
        </p>
      </div>
    </motion.div>
  );
}

function CredentialsContent() {
  const { credentials, loading, addCredential, updateCredential, deleteCredential } = useCredentials();
  const { isParent } = useFamily();
  const { currentTheme, theme } = useTheme();
  const [showModal, setShowModal] = useState(false);
  const [editingCredential, setEditingCredential] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [formData, setFormData] = useState({
    name: '',
    websiteUrl: '',
    username: '',
    password: '',
    category: 'other',
    notes: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingCredential) {
      await updateCredential(editingCredential.id, formData);
    } else {
      await addCredential(formData);
    }
    handleCloseModal();
  };

  const handleEdit = (credential) => {
    setEditingCredential(credential);
    setFormData({
      name: credential.name,
      websiteUrl: credential.websiteUrl || '',
      username: credential.username || '',
      password: credential.password || '',
      category: credential.category,
      notes: credential.notes || '',
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCredential(null);
    setFormData({
      name: '',
      websiteUrl: '',
      username: '',
      password: '',
      category: 'other',
      notes: '',
    });
  };

  const filteredCredentials = filterCategory === 'all'
    ? credentials
    : credentials.filter(c => c.category === filterCategory);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🔐</div>
          <p className="text-xl font-bold text-purple-600">Loading credentials...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-4xl font-display font-bold mb-2">
              <span className={currentTheme === 'dark' ? 'text-purple-400' : 'gradient-text'}>
                {currentTheme === 'dark' ? 'Secret Vault' : 'Family Credentials'}
              </span>
            </h1>
            <p className={`text-sm md:text-base ${currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'} font-semibold`}>
              {credentials.length} {currentTheme === 'dark' ? 'hidden' : 'saved'} {currentTheme === 'dark' ? 'secret' : 'credential'}{credentials.length !== 1 ? 's' : ''}
            </p>
          </div>

          {isParent() && (
            <button
              onClick={() => setShowModal(true)}
              className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 md:px-6 py-3 rounded-2xl font-bold hover:from-blue-600 hover:to-purple-600 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              aria-label={currentTheme === 'dark' ? 'Hide Secret' : 'Add Credential'}
            >
              <FaPlus /> <span className="hidden sm:inline">{currentTheme === 'dark' ? 'Hide Secret' : 'Add Credential'}</span>
            </button>
          )}
        </div>

        {/* Security Notice */}
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <FaLock className="text-yellow-600 text-xl flex-shrink-0 mt-1" />
            <div>
              <p className="font-bold text-yellow-900 mb-1">Security Notice</p>
              <p className="text-sm text-yellow-800">
                Credentials are stored securely in your family's Firebase database and only accessible to authenticated family members.
                However, for maximum security with highly sensitive accounts (banking, etc.), consider using a dedicated password manager.
              </p>
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className={`${theme.colors.bgCard} rounded-2xl p-4 shadow-lg mb-6`}>
          <h3 className={`font-bold ${theme.colors.text} mb-3`}>Filter by Category</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterCategory('all')}
              className={`px-4 py-2 rounded-xl font-bold transition-all ${
                filterCategory === 'all'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All ({credentials.length})
            </button>
            {CATEGORIES.map(cat => {
              const count = credentials.filter(c => c.category === cat.value).length;
              return (
                <button
                  key={cat.value}
                  onClick={() => setFilterCategory(cat.value)}
                  className={`px-4 py-2 rounded-xl font-bold transition-all ${
                    filterCategory === cat.value
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {cat.icon} {cat.label} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Credentials Grid */}
      {filteredCredentials.length === 0 ? (
        <div className={`${theme.colors.bgCard} rounded-2xl p-12 text-center shadow-lg`}>
          <div className="text-6xl mb-4">🔐</div>
          <p className={`text-xl font-bold ${theme.colors.textMuted}`}>
            {filterCategory === 'all' ? 'No credentials yet' : 'No credentials in this category'}
          </p>
          <p className={theme.colors.textMuted}>
            {isParent()
              ? 'Add your family\'s website credentials to keep them organized and accessible'
              : 'Parents can add credentials for family accounts'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredCredentials.map(credential => (
              <CredentialCard
                key={credential.id}
                credential={credential}
                onEdit={handleEdit}
                onDelete={deleteCredential}
                isParent={isParent()}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto p-4"
            onClick={handleCloseModal}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className={`${theme.colors.bgCard} rounded-3xl p-6 max-w-2xl w-full shadow-2xl my-8 max-h-[95vh] overflow-y-auto`}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-display font-bold gradient-text">
                  🔐 {editingCredential ? 'Edit' : 'Add'} Credential
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 p-2"
                >
                  <FaTimes size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className={`block text-sm font-bold ${theme.colors.text} mb-2`}>
                    Account Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., School Portal, Library Account"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className={`block text-sm font-bold ${theme.colors.text} mb-2`}>
                    Category *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, category: cat.value })}
                        className={`p-3 rounded-xl border-2 transition-all text-center ${
                          formData.category === cat.value
                            ? 'border-purple-500 bg-purple-50 scale-105'
                            : 'border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        <div className="text-2xl mb-1">{cat.icon}</div>
                        <div className={`text-xs font-bold ${theme.colors.text}`}>{cat.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-bold ${theme.colors.text} mb-2`}>
                    Website URL
                  </label>
                  <input
                    type="url"
                    value={formData.websiteUrl}
                    onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                    placeholder="https://example.com"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none font-semibold"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-bold ${theme.colors.text} mb-2`}>
                    Username / Email
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="username or email@example.com"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none font-semibold"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-bold ${theme.colors.text} mb-2`}>
                    Password
                  </label>
                  <input
                    type="text"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Enter password"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none font-semibold font-mono"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-bold ${theme.colors.text} mb-2`}>
                    Notes (optional)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional information, security questions, etc."
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none font-semibold"
                    rows={3}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 rounded-xl font-bold hover:from-blue-600 hover:to-purple-600 transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <FaPlus /> {editingCredential ? 'Update' : 'Add'} Credential
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function CredentialsPage() {
  return (
    <DashboardLayout>
      <CredentialsContent />
    </DashboardLayout>
  );
}
