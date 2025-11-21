'use client';

import { motion } from 'framer-motion';
import { getIcon } from '@/lib/icons';
import UserAvatar from './UserAvatar';
import { useFamily } from '@/contexts/FamilyContext';
import { useAuth } from '@/contexts/AuthContext';
import { useChores } from '@/hooks/useFirestore';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import toast from 'react-hot-toast';

export default function ChoreCard({ chore }) {
  const { getMemberById, isParent } = useFamily();
  const { submitChore } = useChores();
  const { userData } = useAuth();
  const assignedMember = getMemberById(chore.assignedTo);

  const getStatusColor = () => {
    switch (chore.status) {
      case 'pending': return 'bg-gray-200 text-gray-700';
      case 'in_progress': return 'bg-blue-200 text-blue-700';
      case 'submitted': return 'bg-yellow-200 text-yellow-700';
      case 'approved': return 'bg-green-200 text-green-700';
      case 'rejected': return 'bg-red-200 text-red-700';
      default: return 'bg-gray-200 text-gray-700';
    }
  };

  const handleSubmit = async () => {
    await submitChore(chore.id);
  };

  const handleApprove = async () => {
    try {
      const approveChore = httpsCallable(functions, 'approveChoreAndAwardPoints');
      const result = await approveChore({
        familyId: userData.familyId,
        choreId: chore.id,
      });
      toast.success(`Approved! ${assignedMember?.displayName} earned ${chore.pointValue} points! 🎉`);
    } catch (error) {
      toast.error('Failed to approve chore');
      console.error(error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all border-4 border-gradient-to-r from-pink-300 to-purple-300"
    >
      {/* Header with icon and avatar */}
      <div className="flex items-start gap-4 mb-3">
        <div className="text-5xl animate-wiggle">
          {getIcon(chore.iconId)}
        </div>
        
        <div className="flex-1">
          <h3 className="text-xl font-display font-bold text-gray-800 mb-1">
            {chore.title}
          </h3>
          {chore.description && (
            <p className="text-sm text-gray-600 mb-2">{chore.description}</p>
          )}
          
          {/* Assigned member */}
          {assignedMember && (
            <div className="flex items-center gap-2 mb-2">
              <UserAvatar user={assignedMember} size={24} />
              <span className="text-sm text-gray-600">
                {assignedMember.displayName}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Points and Status */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <span className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-md">
          ⭐ {chore.pointValue} points
        </span>
        <span className={`px-4 py-1.5 rounded-full text-sm font-semibold ${getStatusColor()}`}>
          {chore.status.replace('_', ' ').toUpperCase()}
        </span>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        {chore.status === 'pending' && chore.assignedTo === userData?.uid && (
          <button
            onClick={handleSubmit}
            className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-2.5 rounded-xl font-bold hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg"
          >
            ✅ Mark Complete
          </button>
        )}

        {chore.status === 'submitted' && isParent() && (
          <>
            <button
              onClick={handleApprove}
              className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-2.5 rounded-xl font-bold hover:from-green-600 hover:to-green-700 transition-all shadow-md hover:shadow-lg"
            >
              ✅ Approve & Award
            </button>
            <button
              className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white py-2.5 rounded-xl font-bold hover:from-red-600 hover:to-red-700 transition-all shadow-md hover:shadow-lg"
            >
              ❌ Reject
            </button>
          </>
        )}

        {chore.status === 'approved' && (
          <div className="flex-1 text-center py-2.5 text-green-600 font-bold">
            🎉 Completed!
          </div>
        )}
      </div>
    </motion.div>
  );
}
