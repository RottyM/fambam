'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useDocuments } from '@/hooks/useFirestore';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { FaFileAlt, FaFilePdf, FaFileImage, FaUpload, FaSearch, FaEye, FaTrash } from 'react-icons/fa';
import { storage, db } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { addDoc, collection, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { useDropzone } from 'react-dropzone';

function DocumentsContent() {
  const { documents, loading } = useDocuments();
  const { userData } = useAuth();
  const { theme } = useTheme();
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const onDrop = async (acceptedFiles) => {
    if (!userData?.familyId) return;
    
    setUploading(true);
    
    for (const file of acceptedFiles) {
      try {
        const timestamp = Date.now();
        const fileName = `${timestamp}_${file.name}`;
        const storageRef = ref(storage, `families/${userData.familyId}/documents/${fileName}`);
        
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        
        await addDoc(collection(db, 'families', userData.familyId, 'documents'), {
          name: file.name,
          uploadedBy: userData.uid,
          storagePath: storageRef.fullPath,
          downloadURL: downloadURL,
          mimeType: file.type,
          size: file.size,
          uploadedAt: serverTimestamp(),
          ocrText: '', // Will be populated by Cloud Function
        });
        
        toast.success(`${file.name} uploaded!`);
      } catch (error) {
        console.error('Upload error:', error);
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    
    setUploading(false);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
  });

  const getFileIcon = (mimeType) => {
    if (mimeType?.includes('pdf')) return <FaFilePdf className="text-red-500" />;
    if (mimeType?.includes('image')) return <FaFileImage className="text-blue-500" />;
    return <FaFileAlt className="text-gray-500" />;
  };

  const handleDeleteDocument = async (document) => {
    if (!document || document.uploadedBy !== userData?.uid) {
      toast.error('You can only delete your own documents');
      return;
    }

    try {
      setDeleting(true);

      // Delete from Storage
      const storageRef = ref(storage, document.storagePath);
      await deleteObject(storageRef);

      // Delete from Firestore
      await deleteDoc(doc(db, 'families', userData.familyId, 'documents', document.id));

      toast.success('Document deleted successfully');
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete document');
    } finally {
      setDeleting(false);
    }
  };

  const handlePreview = (document) => {
    // Open in new tab for preview (browser will handle PDF/image preview)
    window.open(document.downloadURL, '_blank', 'noopener,noreferrer');
  };

  const filteredDocs = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.ocrText?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">📄</div>
          <p className="text-xl font-bold text-purple-600">Loading documents...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl md:text-4xl font-display font-bold mb-2">
          <span className="gradient-text">Family Documents</span>
        </h1>
        <p className="text-sm md:text-base text-gray-600 font-semibold">
          {documents.length} documents stored securely
        </p>
      </div>

      {/* Upload area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        {...getRootProps()}
        className={`border-4 border-dashed rounded-3xl p-12 mb-8 text-center cursor-pointer transition-all ${
          isDragActive
            ? 'border-purple-500 bg-purple-50'
            : `border-gray-300 hover:border-purple-400 ${theme.colors.bgCard}`
        }`}
      >
        <input {...getInputProps()} />
        <div className="text-6xl mb-4 animate-bounce-slow">
          {uploading ? '⏳' : '📤'}
        </div>
        <h3 className="text-2xl font-display font-bold mb-2 text-gray-800">
          {uploading ? 'Uploading...' : isDragActive ? 'Drop files here!' : 'Upload Documents'}
        </h3>
        <p className="text-gray-600 font-semibold">
          Drag & drop files or click to browse<br />
          <span className="text-sm">Supports PDF, Images, Word documents</span>
        </p>
      </motion.div>

      {/* Search bar */}
      <div className="mb-6">
        <div className="relative">
          <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search documents (including OCR text)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none font-semibold shadow-md"
          />
        </div>
      </div>

      {/* Documents grid */}
      {filteredDocs.length === 0 ? (
        <div className={`${theme.colors.bgCard} rounded-2xl p-12 text-center shadow-lg`}>
          <div className="text-6xl mb-4">📁</div>
          <p className={`text-xl font-bold ${theme.colors.textMuted}`}>
            {searchTerm ? 'No documents found' : 'No documents yet'}
          </p>
          <p className={theme.colors.textMuted}>
            {searchTerm ? 'Try a different search term' : 'Upload your first document above'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocs.map(doc => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.02 }}
              className={`${theme.colors.bgCard} rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all`}
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="text-4xl">
                  {getFileIcon(doc.mimeType)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-800 mb-1 truncate">
                    {doc.name}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {new Date(doc.uploadedAt?.seconds * 1000).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(doc.size / 1024).toFixed(0)} KB
                  </p>
                </div>
              </div>

              {doc.ocrText && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600 line-clamp-3">
                    <span className="font-bold">OCR: </span>
                    {doc.ocrText}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => handlePreview(doc)}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2 rounded-xl font-bold hover:from-purple-600 hover:to-pink-600 transition-all"
                >
                  <FaEye /> Preview
                </button>

                {doc.uploadedBy === userData?.uid && (
                  <button
                    onClick={() => setDeleteConfirm(doc)}
                    className="px-4 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all"
                    title="Delete document"
                  >
                    <FaTrash />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => !deleting && setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className={`${theme.colors.bgCard} rounded-3xl p-8 max-w-md w-full shadow-2xl`}
            >
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">🗑️</div>
                <h2 className={`text-2xl font-display font-bold mb-2 ${theme.colors.text}`}>
                  Delete Document?
                </h2>
                <p className={theme.colors.textMuted}>
                  Are you sure you want to delete{' '}
                  <strong>{deleteConfirm.name}</strong>? This action cannot be undone.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  disabled={deleting}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteDocument(deleteConfirm)}
                  disabled={deleting}
                  className="flex-1 bg-red-500 text-white py-3 rounded-xl font-bold hover:bg-red-600 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {deleting ? (
                    <>Deleting...</>
                  ) : (
                    <>
                      <FaTrash /> Delete
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function DocumentsPage() {
  return (
    <DashboardLayout>
      <DocumentsContent />
    </DashboardLayout>
  );
}
