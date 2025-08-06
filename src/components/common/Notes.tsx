// Import React and necessary hooks for state management and lifecycle
import React, { useState, useEffect } from "react";
// Import icon components from Lucide React icon library
import { Plus, Search, Edit2, Trash2, Save, X } from "lucide-react";
// Import CSS styles for the Notes component
import "./Notes.css";
// Import crypto utilities for encryption/decryption
import { CryptoUtils } from "../../utils/crypto";

// Define the structure of a Note object using TypeScript interface
interface Note {
  id?: number; // Optional auto-generated unique identifier
  title: string; // The note's title/subject
  content: string; // The main text content of the note
  createdAt: Date; // Timestamp when the note was first created
  updatedAt: Date; // Timestamp when the note was last modified
}

// Custom React hook for managing IndexedDB operations
const useNotesDB = () => {
  // Define the database name - this will be the identifier in browser storage
  const dbName = "NotesDatabase";
  // Database version number - increment this to trigger schema updates
  const version = 1;
  // Store database instance reference outside React state to avoid re-renders
  // This prevents issues with async database initialization
  let dbInstance: IDBDatabase | null = null;

  // Initialize the IndexedDB database connection
  const init = (): Promise<IDBDatabase> => {
    // Return a Promise to handle the asynchronous database opening
    return new Promise((resolve, reject) => {
      // If database is already initialized, return the existing instance
      if (dbInstance) {
        resolve(dbInstance);
        return;
      }

      // Open the database with specified name and version
      const request = indexedDB.open(dbName, version);

      // Handle database opening errors
      request.onerror = () => reject(request.error);

      // Handle successful database opening
      request.onsuccess = () => {
        // Store the database instance for future use
        dbInstance = request.result;
        // Resolve the promise with the database instance
        resolve(request.result);
      };

      // Handle database schema creation/upgrade (runs when version changes)
      request.onupgradeneeded = (event) => {
        // Get the database instance from the event
        const database = (event.target as IDBOpenDBRequest).result;
        // Check if the 'notes' object store doesn't exist yet
        if (!database.objectStoreNames.contains("notes")) {
          // Create the 'notes' object store with auto-incrementing ID
          const store = database.createObjectStore("notes", {
            keyPath: "id", // Use 'id' field as the primary key
            autoIncrement: true, // Automatically generate unique IDs
          });
          // Create indexes for efficient searching by title and creation date
          store.createIndex("title", "title", { unique: false });
          store.createIndex("createdAt", "createdAt", { unique: false });
        }
      };
    });
  };

  // Retrieve all notes from the database using async/await
  const getAllNotes = async (): Promise<Note[]> => {
    // Ensure database is initialized before performing operations
    const db = await init();

    // Wrap the IndexedDB operation in a Promise and await it
    const encryptedNotes = await new Promise<Note[]>((resolve, reject) => {
      // Create a read-only transaction for the 'notes' object store
      const transaction = db.transaction(["notes"], "readonly");
      // Get reference to the 'notes' object store
      const store = transaction.objectStore("notes");
      // Request all records from the store
      const request = store.getAll();

      // Handle successful data retrieval
      request.onsuccess = () => {
        // Resolve with the retrieved notes
        resolve(request.result);
      };
      // Handle database query errors
      request.onerror = () => reject(request.error);
    });

    // Decrypt all notes
    const decryptedNotes = await Promise.all(
      encryptedNotes.map(async (note) => ({
        ...note,
        title: await CryptoUtils.decrypt(note.title),
        content: await CryptoUtils.decrypt(note.content),
      }))
    );

    // Sort notes by updatedAt date in descending order (newest first) and return
    return decryptedNotes.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  };

  // Add a new note to the database using async/await
  const addNote = async (note: Omit<Note, "id">): Promise<number> => {
    // Ensure database is initialized
    const db = await init();

    // Encrypt the note data before storing
    const encryptedNote = {
      ...note,
      title: await CryptoUtils.encrypt(note.title),
      content: await CryptoUtils.encrypt(note.content),
    };

    // Wrap the IndexedDB operation in a Promise and await it
    const noteId = await new Promise<number>((resolve, reject) => {
      // Create a read-write transaction for adding data
      const transaction = db.transaction(["notes"], "readwrite");
      // Get reference to the 'notes' object store
      const store = transaction.objectStore("notes");
      // Add the encrypted note to the store (ID will be auto-generated)
      const request = store.add(encryptedNote);

      // Handle successful note addition
      request.onsuccess = () => resolve(request.result as number);
      // Handle database insertion errors
      request.onerror = () => reject(request.error);
    });

    // Return the generated note ID
    return noteId;
  };

  // Update an existing note in the database using async/await
  const updateNote = async (note: Note): Promise<void> => {
    // Ensure database is initialized
    const db = await init();

    // Encrypt the note data before updating
    const encryptedNote = {
      ...note,
      title: await CryptoUtils.encrypt(note.title),
      content: await CryptoUtils.encrypt(note.content),
    };

    // Wrap the IndexedDB operation in a Promise and await it
    await new Promise<void>((resolve, reject) => {
      // Create a read-write transaction for updating data
      const transaction = db.transaction(["notes"], "readwrite");
      // Get reference to the 'notes' object store
      const store = transaction.objectStore("notes");
      // Update the encrypted note using put() - creates if doesn't exist, updates if it does
      const request = store.put(encryptedNote);

      // Handle successful note update
      request.onsuccess = () => resolve();
      // Handle database update errors
      request.onerror = () => reject(request.error);
    });
  };

  // Delete a note from the database by its ID using async/await
  const deleteNote = async (id: number): Promise<void> => {
    // Ensure database is initialized
    const db = await init();

    // Wrap the IndexedDB operation in a Promise and await it
    await new Promise<void>((resolve, reject) => {
      // Create a read-write transaction for deleting data
      const transaction = db.transaction(["notes"], "readwrite");
      // Get reference to the 'notes' object store
      const store = transaction.objectStore("notes");
      // Delete the note with the specified ID
      const request = store.delete(id);

      // Handle successful note deletion
      request.onsuccess = () => resolve();
      // Handle database deletion errors
      request.onerror = () => reject(request.error);
    });
  };

  // Return all database operation functions for use in components
  return { getAllNotes, addNote, updateNote, deleteNote, init };
};

// Main Notes component - a React Functional Component
const Notes: React.FC = () => {
  // State to store the array of all notes
  const [notes, setNotes] = useState<Note[]>([]);
  // State to store the current search/filter term
  const [searchTerm, setSearchTerm] = useState("");
  // State to track which note is currently selected for editing
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  // State to track if user is currently creating a new note
  const [isCreating, setIsCreating] = useState(false);
  // State to store the title input value for create/edit operations
  const [title, setTitle] = useState("");
  // State to store the content input value for create/edit operations
  const [content, setContent] = useState("");
  // Initialize the database hook to get database operation functions
  const db = useNotesDB();

  // useEffect hook runs when component mounts (empty dependency array [])
  // This loads all notes from database when the app first starts
  useEffect(() => {
    loadNotes();
  }, []);

  // Function to load all notes from database and update state
  const loadNotes = async () => {
    try {
      // Fetch all notes from IndexedDB
      const allNotes = await db.getAllNotes();
      // Update the notes state with fetched data
      setNotes(allNotes);
    } catch (error) {
      // Log any errors that occur during note loading
      console.error("Error loading notes:", error);
    }
  };

  // Function to handle creating a new note
  const handleCreateNote = async () => {
    // Validate that both title and content have non-empty values
    if (!title.trim() || !content.trim()) return;

    try {
      // Create new note object without ID (will be auto-generated)
      const newNote: Omit<Note, "id"> = {
        title: title.trim(), // Remove whitespace from title
        content: content.trim(), // Remove whitespace from content
        createdAt: new Date(), // Set creation timestamp
        updatedAt: new Date(), // Set update timestamp (same as creation)
      };

      // Add the new note to the database
      await db.addNote(newNote);
      // Refresh the notes list to include the new note
      await loadNotes();

      // Clear the form inputs
      setTitle("");
      setContent("");
      // Exit creation mode
      setIsCreating(false);
    } catch (error) {
      // Log any errors that occur during note creation
      console.error("Error creating note:", error);
    }
  };

  // Function to handle updating an existing note
  const handleUpdateNote = async () => {
    // Validate that a note is selected and inputs have valid content
    if (!selectedNote || !title.trim() || !content.trim()) return;

    try {
      // Create updated note object by spreading existing note and updating fields
      const updatedNote: Note = {
        ...selectedNote, // Keep all existing properties (id, createdAt)
        title: title.trim(), // Update title with trimmed input
        content: content.trim(), // Update content with trimmed input
        updatedAt: new Date(), // Update the modification timestamp
      };

      // Save the updated note to the database
      await db.updateNote(updatedNote);
      // Refresh the notes list to reflect changes
      await loadNotes();

      // Clear the selection and form inputs
      setSelectedNote(null);
      setTitle("");
      setContent("");
    } catch (error) {
      // Log any errors that occur during note updating
      console.error("Error updating note:", error);
    }
  };

  // Function to handle deleting a note
  const handleDeleteNote = async (id: number) => {
    // Show confirmation dialog to prevent accidental deletions
    if (!confirm("Are you sure you want to delete this note?")) return;

    try {
      // Delete the note from the database using its ID
      await db.deleteNote(id);
      // Refresh the notes list to remove the deleted note
      await loadNotes();

      // If the deleted note was currently selected, clear the editor
      if (selectedNote?.id === id) {
        setSelectedNote(null); // Clear selected note
        setTitle(""); // Clear title input
        setContent(""); // Clear content input
      }
    } catch (error) {
      // Log any errors that occur during note deletion
      console.error("Error deleting note:", error);
    }
  };

  // Function to handle selecting a note for editing
  const handleSelectNote = (note: Note) => {
    setSelectedNote(note); // Set the selected note
    setTitle(note.title); // Populate title input with note's title
    setContent(note.content); // Populate content input with note's content
    setIsCreating(false); // Exit creation mode if active
  };

  // Function to handle starting creation of a new note
  const handleNewNote = () => {
    setIsCreating(true); // Enter creation mode
    setSelectedNote(null); // Clear any selected note
    setTitle(""); // Clear title input
    setContent(""); // Clear content input
  };

  // Function to handle canceling create/edit operations
  const handleCancel = () => {
    setIsCreating(false); // Exit creation mode
    setSelectedNote(null); // Clear selected note
    setTitle(""); // Clear title input
    setContent(""); // Clear content input
  };

  // Filter notes based on search term, checking both title and content
  const filteredNotes = notes.filter(
    (note) =>
      // Convert both search term and note fields to lowercase for case-insensitive search
      note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Utility function to format dates for display
  const formatDate = (date: Date) => {
    // Format date as "MMM DD, YYYY, HH:MM AM/PM"
    return new Date(date).toLocaleDateString("en-US", {
      month: "short", // "Jan", "Feb", etc.
      day: "numeric", // 1, 2, 3, etc.
      year: "numeric", // 2023, 2024, etc.
      hour: "2-digit", // 01, 02, etc.
      minute: "2-digit", // 00, 01, etc.
    });
  };

  return (
    <div className="notes-app">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <button onClick={handleNewNote} className="new-note-btn">
            <Plus className="icon" />
            New Note
          </button>
        </div>

        <div className="search-container">
          <div className="search-wrapper">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        <div className="notes-list">
          {filteredNotes.length === 0 ? (
            <div className="empty-state">
              {searchTerm ? "No notes found" : "No notes yet"}
            </div>
          ) : (
            filteredNotes.map((note) => (
              <div
                key={note.id}
                onClick={() => handleSelectNote(note)}
                className={`note-item ${
                  selectedNote?.id === note.id ? "selected" : ""
                }`}
              >
                <h3 className="note-title">{note.title}</h3>
                <p className="note-preview">{note.content}</p>
                <p className="note-date">{formatDate(note.updatedAt)}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {isCreating || selectedNote ? (
          <>
            <div className="editor-header">
              <input
                type="text"
                placeholder="Note title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="title-input"
              />
              <div className="action-buttons">
                <button
                  onClick={isCreating ? handleCreateNote : handleUpdateNote}
                  disabled={!title.trim() || !content.trim()}
                  className="btn btn-save"
                >
                  <Save className="icon" />
                  Save
                </button>
                {!isCreating && selectedNote && (
                  <button
                    onClick={() => handleDeleteNote(selectedNote.id!)}
                    className="btn btn-delete"
                  >
                    <Trash2 className="icon" />
                    Delete
                  </button>
                )}
                <button onClick={handleCancel} className="btn btn-cancel">
                  <X className="icon" />
                  Cancel
                </button>
              </div>
            </div>
            <div className="editor-content">
              <textarea
                placeholder="Start writing your note..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="content-textarea"
              />
            </div>
          </>
        ) : (
          <div className="empty-editor">
            <div className="empty-editor-content">
              <Edit2 className="empty-icon" />
              <p>Select a note to edit or create a new one</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notes;
