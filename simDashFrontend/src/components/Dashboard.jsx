import { useState } from 'react'
import RoomGroup from './RoomGroup'
import InstanceCard from './InstanceCard'
import SearchBar from './SearchBar'

const Dashboard = ({ instances, rooms, onAddToRoom, onRemoveFromRoom, onEditInstanceTitle }) => {
  const [searchTerm, setSearchTerm] = useState('')

  // Find instances not in any room
  const standaloneInstances = instances.filter(instance => 
    !rooms.some(room => room.instances.includes(instance.id))
  )

  // Filter instances based on search term
  const filteredStandaloneInstances = standaloneInstances.filter(instance =>
    instance.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    instance.id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Filter rooms based on search term
  const filteredRooms = rooms.filter(room =>
    room.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    room.instances.some(instanceId => {
      const instance = instances.find(i => i.id === instanceId)
      return instance && (
        instance.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        instance.id.toLowerCase().includes(searchTerm.toLowerCase())
      )
    })
  )

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Rooms</h1>
        <SearchBar onSearch={setSearchTerm} />
      </div>

      <div className="space-y-6 pb-6">
        {filteredRooms.map(room => (
          <RoomGroup
            key={room.id}
            room={room}
            instances={instances.filter(instance => room.instances.includes(instance.id))}
            onRemoveFromRoom={onRemoveFromRoom}
            onAddToRoom={onAddToRoom}
            onEditInstanceTitle={onEditInstanceTitle}
            allRooms={rooms}
          />
        ))}

        {filteredStandaloneInstances.length > 0 && (
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-xl font-semibold mb-4">Standalone Instances</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStandaloneInstances.map(instance => (
                <InstanceCard
                  key={instance.id}
                  instance={instance}
                  onEditTitle={onEditInstanceTitle}
                  rooms={rooms}
                  onAddToRoom={onAddToRoom}
                  inRoom={false}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard