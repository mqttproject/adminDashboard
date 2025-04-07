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

  const handleAddToRoom = (instanceId, roomId) => {
    socket.emit('addInstanceToRoom', { instanceId, roomId })
  }

  const handleRemoveFromRoom = (instanceId, roomId) => {
    socket.emit('removeInstanceFromRoom', { instanceId, roomId })
  }

  const handleEditInstanceTitle = (instanceId, newTitle) => {
    socket.emit('updateInstanceTitle', { instanceId, title: newTitle })
  }

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
            onAddToRoom={handleAddToRoom}
            onRemoveFromRoom={handleRemoveFromRoom}
            onEditInstanceTitle={handleEditInstanceTitle}
          />
        )}
      </main>
    </div>
  )
}

export default App