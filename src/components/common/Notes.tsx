import React, { useState, useEffect } from "react";
import { Plus, Search, Edit2, Trash2, Save, X } from "lucide-react";
import "./Notes.css";

interface Note {
  id?: number;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const useNotesDB = () => {
  const dbName = "NotesDatabase";
  const version = 1;
  // const dbRef = useState<IDBDatabase | null>(null)[0];
  let dbInstance: IDBDatabase | null = null;

  const init = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      if (dbInstance) {
        resolve(dbInstance);
        return;
      }

      const request = indexedDB.open(dbName, version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        dbInstance = request.result;
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const database = (event.target as IDBOpenDBRequest).result;
        if (!database.objectStoreNames.contains("notes")) {
          const store = database.createObjectStore("notes", {
            keyPath: "id",
            autoIncrement: true,
          });
          store.createIndex("title", "title", { unique: false });
          store.createIndex("createdAt", "createdAt", { unique: false });
        }
      };
    });
  };

  const getAllNotes = async (): Promise<Note[]> => {
    const db = await init();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["notes"], "readonly");
      const store = transaction.objectStore("notes");
      const request = store.getAll();

      request.onsuccess = () => {
        const notes = request.result.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        resolve(notes);
      };
      request.onerror = () => reject(request.error);
    });
  };

  const addNote = async (note: Omit<Note, "id">): Promise<number> => {
    const db = await init();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["notes"], "readwrite");
      const store = transaction.objectStore("notes");
      const request = store.add(note);

      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  };

  const updateNote = async (note: Note): Promise<void> => {
    const db = await init();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["notes"], "readwrite");
      const store = transaction.objectStore("notes");
      const request = store.put(note);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  };

  const deleteNote = async (id: number): Promise<void> => {
    const db = await init();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["notes"], "readwrite");
      const store = transaction.objectStore("notes");
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  };

  return { getAllNotes, addNote, updateNote, deleteNote, init };
};

const Notes: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const db = useNotesDB();

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      const allNotes = await db.getAllNotes();
      setNotes(allNotes);
    } catch (error) {
      console.error("Error loading notes:", error);
    }
  };

  const handleCreateNote = async () => {
    if (!title.trim() || !content.trim()) return;

    try {
      const newNote: Omit<Note, "id"> = {
        title: title.trim(),
        content: content.trim(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.addNote(newNote);
      await loadNotes();

      setTitle("");
      setContent("");
      setIsCreating(false);
    } catch (error) {
      console.error("Error creating note:", error);
    }
  };

  const handleUpdateNote = async () => {
    if (!selectedNote || !title.trim() || !content.trim()) return;

    try {
      const updatedNote: Note = {
        ...selectedNote,
        title: title.trim(),
        content: content.trim(),
        updatedAt: new Date(),
      };

      await db.updateNote(updatedNote);
      await loadNotes();

      setSelectedNote(null);
      setTitle("");
      setContent("");
    } catch (error) {
      console.error("Error updating note:", error);
    }
  };

  const handleDeleteNote = async (id: number) => {
    if (!confirm("Are you sure you want to delete this note?")) return;

    try {
      await db.deleteNote(id);
      await loadNotes();

      if (selectedNote?.id === id) {
        setSelectedNote(null);
        setTitle("");
        setContent("");
      }
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  };

  const handleSelectNote = (note: Note) => {
    setSelectedNote(note);
    setTitle(note.title);
    setContent(note.content);
    setIsCreating(false);
  };

  const handleNewNote = () => {
    setIsCreating(true);
    setSelectedNote(null);
    setTitle("");
    setContent("");
  };

  const handleCancel = () => {
    setIsCreating(false);
    setSelectedNote(null);
    setTitle("");
    setContent("");
  };

  const filteredNotes = notes.filter(
    (note) =>
      note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
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
