import { useState, useRef, useEffect } from 'react'
import { FaServer } from '@react-icons/all-files/fa/FaServer'
import { FaDatabase } from '@react-icons/all-files/fa/FaDatabase'
import { FaEllipsisV } from '@react-icons/all-files/fa/FaEllipsisV'
import { FaCog } from '@react-icons/all-files/fa/FaCog'
import DeviceList from './DeviceList'

const InstanceCard = ({ instance, onEditTitle, onRemoveFromRoom, rooms, onAddToRoom, inRoom }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(instance.title)
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isEditing])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleTitleSubmit = () => {
    onEditTitle(instance.id, title)
    setIsEditing(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleTitleSubmit()
    } else if (e.key === 'Escape') {
      setTitle(instance.title)
      setIsEditing(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
      <div className="p-4 border-b">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${instance.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="font-medium">{instance.status === 'online' ? 'Online' : 'Offline'}</span>
          </div>
          <div className="relative" ref={menuRef}>
            <button 
              className="p-1 text-gray-500 hover:text-primary rounded"
              onClick={() => setShowMenu(!showMenu)}
            >
              <FaEllipsisV />
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
                <div className="py-1">
                  {inRoom && (
                    <button 
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => {
                        onRemoveFromRoom(instance.id)
                        setShowMenu(false)
                      }}
                    >
                      Remove from room
                    </button>
                  )}
                  <div className="border-t"></div>
                  {rooms.map(room => (
                    <button 
                      key={room.id}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => {
                        onAddToRoom(room.id)
                        setShowMenu(false)
                      }}
                    >
                      Add to {room.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-4">
          <p className="text-sm text-gray-500">Instance</p>
          <div className="flex items-center justify-between">
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                className="border rounded px-2 py-1 w-full"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={handleKeyDown}
              />
            ) : (
              <h3 
                className="font-semibold text-lg truncate hover:underline cursor-pointer" 
                onClick={() => setIsEditing(true)}
                title="Click to edit"
              >
                {instance.title}
              </h3>
            )}
            <div className="flex items-center space-x-2">
              <FaServer className="text-gray-500" />
              <FaDatabase className="text-gray-500" />
            </div>
          </div>
          <p className="text-sm text-gray-500">{instance.id}</p>
          <p className="text-sm text-gray-500">Simulator</p>
        </div>

        <DeviceList devices={instance.devices} />
      </div>
    </div>
  )
}

export default InstanceCard