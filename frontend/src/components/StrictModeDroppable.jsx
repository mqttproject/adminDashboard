import { useEffect, useState } from 'react';
import { Droppable } from 'react-beautiful-dnd';

// This component fixes issues with StrictMode and react-beautiful-dnd
const StrictModeDroppable = ({ children, ...props }) => {
    const [enabled, setEnabled] = useState(false);

    useEffect(() => {
        // Using timeout to ensure we enable droppable after React has processed all effects
        const animation = requestAnimationFrame(() => setEnabled(true));

        return () => {
            cancelAnimationFrame(animation);
            setEnabled(false);
        };
    }, []);

    if (!enabled) {
        return null;
    }

    return <Droppable {...props}>{children}</Droppable>;
};

export default StrictModeDroppable;