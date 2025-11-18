// Fun icon mappings for tasks, chores, and categories
export const ICON_MAP = {
  // Chore icons
  'cleaning_robot': '🤖🧹',
  'vacuum': '🧹✨',
  'dishes': '🍽️💦',
  'laundry': '👕🌀',
  'trash': '🗑️💪',
  'pet_care': '🐕🥰',
  'plant_water': '🌱💧',
  'room_clean': '🛏️✨',
  'bathroom': '🚽✨',
  'kitchen': '🍳🧽',
  'yard_work': '🌳🌈',
  'car_wash': '🚗💦',
  
  // Task status icons
  'crying_banana': '🍌😢',
  'happy_star': '⭐😊',
  'fire': '🔥💯',
  'rocket': '🚀✨',
  'party': '🎉🎊',
  'thinking': '🤔💭',
  'celebration': '🎉🥳',
  'trophy': '🏆👑',
  
  // Family member roles
  'super_parent': '👨‍👩‍👧‍👦💪',
  'cool_kid': '😎🎮',
  'baby': '👶🍼',
  'teen': '🧑‍🎤🎵',
  
  // General categories
  'winking_alien': '👽😉',
  'unicorn': '🦄✨',
  'dinosaur': '🦖🔥',
  'robot': '🤖⚡',
  'astronaut': '👨‍🚀🚀',
  'wizard': '🧙‍♂️✨',
  'ninja': '🥷⚔️',
  'pirate': '🏴‍☠️💰',
  'superhero': '🦸‍♂️💥',
  'mermaid': '🧜‍♀️🌊',
  
  // Rewards
  'ice_cream': '🍦😋',
  'pizza': '🍕🤤',
  'movie': '🎬🍿',
  'toy': '🎁🎮',
  'money': '💰💵',
  'book': '📚🌈',
  'game': '🎮🕹️',
  
  // Documents
  'insurance': '📋🏥',
  'passport': '🛂✈️',
  'important': '⚠️📄',
  'school': '🏫📚',
  'medical': '🏥💊',
  
  // Memories
  'birthday': '🎂🎉',
  'vacation': '🏖️📸',
  'holiday': '🎄🎁',
  'family_time': '👨‍👩‍👧‍👦❤️',
  'achievement': '🏆🌟',
  
  // Default
  'default': '✨💫',
};

export const getIcon = (iconId) => {
  return ICON_MAP[iconId] || ICON_MAP['default'];
};

// Category groups for selection UI
export const ICON_CATEGORIES = {
  chores: [
    { id: 'cleaning_robot', label: 'Cleaning Robot' },
    { id: 'vacuum', label: 'Vacuum' },
    { id: 'dishes', label: 'Dishes' },
    { id: 'laundry', label: 'Laundry' },
    { id: 'trash', label: 'Trash' },
    { id: 'pet_care', label: 'Pet Care' },
    { id: 'plant_water', label: 'Water Plants' },
    { id: 'room_clean', label: 'Clean Room' },
    { id: 'bathroom', label: 'Bathroom' },
    { id: 'kitchen', label: 'Kitchen' },
    { id: 'yard_work', label: 'Yard Work' },
    { id: 'car_wash', label: 'Car Wash' },
  ],
  fun: [
    { id: 'unicorn', label: 'Unicorn' },
    { id: 'dinosaur', label: 'Dinosaur' },
    { id: 'robot', label: 'Robot' },
    { id: 'astronaut', label: 'Astronaut' },
    { id: 'wizard', label: 'Wizard' },
    { id: 'ninja', label: 'Ninja' },
    { id: 'pirate', label: 'Pirate' },
    { id: 'superhero', label: 'Superhero' },
    { id: 'mermaid', label: 'Mermaid' },
  ],
  rewards: [
    { id: 'ice_cream', label: 'Ice Cream' },
    { id: 'pizza', label: 'Pizza' },
    { id: 'movie', label: 'Movie Night' },
    { id: 'toy', label: 'Toy' },
    { id: 'money', label: 'Money' },
    { id: 'book', label: 'Book' },
    { id: 'game', label: 'Video Game' },
  ],
  status: [
    { id: 'fire', label: 'On Fire' },
    { id: 'rocket', label: 'Rocket' },
    { id: 'party', label: 'Party' },
    { id: 'trophy', label: 'Trophy' },
    { id: 'crying_banana', label: 'Crying Banana' },
    { id: 'happy_star', label: 'Happy Star' },
  ],
};
