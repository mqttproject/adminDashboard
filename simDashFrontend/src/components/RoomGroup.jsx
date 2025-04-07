import { useState } from 'react'
import InstanceCard from './InstanceCard'
import { FaCog } from '@react-icons/all-files/fa/FaCog'

const RoomGroup = ({ room, instances, onAddToRoom, onRemoveFromRoom, onEditInstanceTitle, allRooms }) => {
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b flex justify-between items-center">
        <div className="flex items-center">
          <h2 className="text-xl font-semibold">{room.title}</h2>
          <button 
            className="ml-2 text-gray-500 hover:text-primary"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? '▼' : '►'}
          </button>
        </div>
        <button className="p-2 text-gray-500 hover:text-primary rounded-full">
          <FaCog />
        </button>
      </div>
      
      {isExpanded && (
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {instances.map(instance => (
              <InstanceCard
                key={instance.id}
                instance={instance}
                onEditTitle={onEditInstanceTitle}
                onRemoveFromRoom={(instanceId) => onRemoveFromRoom(instanceId, room.id)}
                rooms={allRooms.filter(r => r.id !== room.id)}
                onAddToRoom={roomId => onAddToRoom(instance.id, roomId)}
                inRoom={true}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default RoomGroup