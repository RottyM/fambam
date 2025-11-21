import { useChores } from '@/hooks/useFirestore'; // Your existing file
import { useFunctions } from '@/hooks/useFamilyData'; // The new file

export default function ChoreList() {
  // 1. Get Data (Your existing hook)
  const { chores } = useChores(); 
  
  // 2. Get Actions (The new hook)
  const { approveChore, loading } = useFunctions();

  return (
    <div>
      {chores.map(chore => (
        <div key={chore.id}>
          <h3>{chore.title}</h3>
          
          {/* When clicked, we call the Server Action */}
          <button 
            onClick={() => approveChore('family-id', chore.id)}
            disabled={loading}
          >
            Approve (+{chore.points} pts)
          </button>
        </div>
      ))}
    </div>
  );
}