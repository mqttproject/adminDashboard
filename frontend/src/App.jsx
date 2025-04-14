import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'

const socket = io('http://localhost:3000')

function App() {
  const [instances, setInstances] = useState([])
  const [rooms, setRooms] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Connect to socket.io
    socket.on('connect', () => {
      console.log('Connected to WebSocket server')
    })

    // Get initial data
    socket.on('initialData', (data) => {
      setInstances(data.instances)
      setRooms(data.rooms)
      setIsLoading(false)
    })

    // Listen for instance updates
    socket.on('instanceUpdate', (updatedInstance) => {
      setInstances(prev => prev.map(instance =>
        instance.id === updatedInstance.id ? updatedInstance : instance
      ))
    })

    // Listen for room updates
    socket.on('roomUpdate', (updatedRooms) => {
      setRooms(updatedRooms)
    })

    // Request initial data
    socket.emit('getInitialData')

    return () => {
      socket.off('connect')
      socket.off('initialData')
      socket.off('instanceUpdate')
      socket.off('roomUpdate')
    }
  }, [])

  const addToRoom = (instanceId, roomId) => {
    // First update local state for immediate UI feedback
    const updatedRooms = rooms.map(room => ({
      ...room,
      instances: room.instances.filter(id => id !== instanceId)
    }));

    setRooms(updatedRooms.map(room => {
      if (room.id === roomId) {
        return {
          ...room,
          instances: [...room.instances, instanceId]
        };
      }
      return room;
    }));

    // Then emit the event to the server
    socket.emit('addInstanceToRoom', { instanceId, roomId });
  };

  const removeFromRoom = (instanceId, roomId) => {
    // First update local state for immediate UI feedback
    setRooms(rooms.map(room => {
      if (room.id === roomId) {
        return {
          ...room,
          instances: room.instances.filter(id => id !== instanceId)
        };
      } else if (room.id === 'unassigned') {
        // Add to unassigned room when removed from another room
        return {
          ...room,
          instances: [...room.instances, instanceId]
        };
      }
      return room;
    }));

    // Then emit the event to the server
    socket.emit('removeInstanceFromRoom', { instanceId, roomId });
  };

  const editInstanceTitle = (instanceId, newTitle) => {
    // First update local state for immediate UI feedback
    setInstances(instances.map(instance =>
      instance.id === instanceId
        ? { ...instance, title: newTitle }
        : instance
    ));

    // Then emit the event to the server
    socket.emit('updateInstanceTitle', { instanceId, title: newTitle });
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : (
          <Dashboard
            instances={instances}
            rooms={rooms}
            onAddToRoom={addToRoom}
            onRemoveFromRoom={removeFromRoom}
            onEditInstanceTitle={editInstanceTitle}
          />
        )}
      </main>
    </div>
  )
}

export default App