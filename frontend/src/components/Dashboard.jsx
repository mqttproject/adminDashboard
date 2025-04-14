import { useState } from 'react'
import { DragDropContext } from 'react-beautiful-dnd'
import RoomGroup from './RoomGroup'
import SearchBar from './SearchBar'

const Dashboard = ({ instances, rooms, onAddToRoom, onRemoveFromRoom, onEditInstanceTitle }) => {
    const [searchTerm, setSearchTerm] = useState('')
    const [isDragging, setIsDragging] = useState(false)

    // Get the unassigned room and other rooms separately
    const unassignedRoom = rooms.find(room => room.id === 'unassigned') || { id: 'unassigned', instances: [] }
    const regularRooms = rooms.filter(room => room.id !== 'unassigned')
    
    // Filter regular rooms based on search term, but don't filter during drag operations
    const filteredRooms = isDragging
        ? regularRooms
        : regularRooms.filter(room =>
            room.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            room.instances.some(instanceId => {
                const instance = instances.find(i => i.id === instanceId)
                return instance && (
                    instance.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    instance.id.toLowerCase().includes(searchTerm.toLowerCase())
                )
            })
        )

    // Get unassigned instances and filter them by search term
    const unassignedInstances = instances.filter(instance => 
        unassignedRoom.instances.includes(instance.id) || 
        !rooms.some(room => room.instances.includes(instance.id))
    )
    
    const filteredUnassignedInstances = isDragging
        ? unassignedInstances
        : unassignedInstances.filter(instance =>
            instance.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            instance.id.toLowerCase().includes(searchTerm.toLowerCase())
        )

    const handleDragStart = () => {
        // Disable filtering during dragging to prevent issues
        setIsDragging(true);
    };

    const handleDragEnd = (result) => {
        setIsDragging(false);

        const { destination, source, draggableId } = result;

        console.log('Drag end:', { destination, source, draggableId });

        // Dropped outside a droppable area
        if (!destination) {
            return;
        }

        // Dropped in the same place
        if (
            destination.droppableId === source.droppableId &&
            destination.index === source.index
        ) {
            return;
        }

        // Moving between different areas
        if (source.droppableId !== destination.droppableId) {
            if (destination.droppableId === 'unassigned') {
                // Just remove from source room - it will automatically appear in unassigned
                onRemoveFromRoom(draggableId, source.droppableId);
            } else if (source.droppableId === 'unassigned') {
                // Moving from unassigned to a room
                onAddToRoom(draggableId, destination.droppableId);
            } else {
                // For room-to-room transfer, use addToRoom which now handles removal from other rooms
                onAddToRoom(draggableId, destination.droppableId);
            }
        }
    };

    return (
        <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">Rooms</h1>
                    <SearchBar onSearch={setSearchTerm} disabled={isDragging} />
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
                            droppableId={room.id}
                        />
                    ))}

                    <div className="bg-white rounded-lg shadow">
                        <div className="p-4 border-b">
                            <h2 className="text-xl font-semibold">Standalone Instances</h2>
                        </div>
                        <RoomGroup
                            isStandalone={true}
                            room={unassignedRoom}
                            instances={filteredUnassignedInstances}
                            onEditInstanceTitle={onEditInstanceTitle}
                            allRooms={regularRooms}
                            onRemoveFromRoom={onRemoveFromRoom}
                            onAddToRoom={onAddToRoom}
                            droppableId="unassigned"
                        />
                    </div>
                </div>
            </div>
        </DragDropContext>
    )
}

export default Dashboard