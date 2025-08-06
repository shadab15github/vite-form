import React, { useState, useEffect } from "react";
import { Plus, Search, Edit2, Trash2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { encrypt, decrypt } from "../../utils/crypto";

interface Note {
  id?: number;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

class NotesDB {
  private dbName = "NotesDatabase";
  private version = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains("notes")) {
          const store = db.createObjectStore("notes", {
            keyPath: "id",
            autoIncrement: true,
          });
          store.createIndex("title", "title", { unique: false });
          store.createIndex("createdAt", "createdAt", { unique: false });
        }
      };
    });
  }

  async getAllNotes(): Promise<Note[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["notes"], "readonly");
      const store = transaction.objectStore("notes");
      const request = store.getAll();

      request.onsuccess = () => {
        const encryptedNotes = request.result;
        Promise.all(
          encryptedNotes.map(async (note) => ({
            ...note,
            title: await decrypt(note.title),
            content: await decrypt(note.content),
          }))
        )
          .then((decryptedNotes) => {
            const notes = decryptedNotes.sort(
              (a, b) =>
                new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            );
            resolve(notes);
          })
          .catch((error) => {
            reject(error);
          });
      };
      request.onerror = () => reject(request.error);
    });
  }

  async addNote(note: Omit<Note, "id">): Promise<number> {
    if (!this.db) await this.init();

    const encryptedNote = {
      ...note,
      title: await encrypt(note.title),
      content: await encrypt(note.content),
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["notes"], "readwrite");
      const store = transaction.objectStore("notes");
      const request = store.add(encryptedNote);

      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  async updateNote(note: Note): Promise<void> {
    if (!this.db) await this.init();

    const encryptedNote = {
      ...note,
      title: await encrypt(note.title),
      content: await encrypt(note.content),
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["notes"], "readwrite");
      const store = transaction.objectStore("notes");
      const request = store.put(encryptedNote);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteNote(id: number): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["notes"], "readwrite");
      const store = transaction.objectStore("notes");
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

const NotesApp: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<number | null>(null);
  const [db] = useState(() => new NotesDB());

  const loadNotes = React.useCallback(async () => {
    try {
      const allNotes = await db.getAllNotes();
      setNotes(allNotes);
    } catch (error) {
      console.error("Error loading notes:", error);
    }
  }, [db]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

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

  const handleDeleteNote = async () => {
    if (!noteToDelete) return;

    try {
      await db.deleteNote(noteToDelete);
      await loadNotes();

      if (selectedNote?.id === noteToDelete) {
        setSelectedNote(null);
        setTitle("");
        setContent("");
      }

      setShowDeleteDialog(false);
      setNoteToDelete(null);
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

  const confirmDelete = (id: number) => {
    setNoteToDelete(id);
    setShowDeleteDialog(true);
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
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-80 bg-card border-r flex flex-col">
        <div className="p-4 border-b">
          <Button onClick={handleNewNote} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            New Note
          </Button>
        </div>

        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              type="text"
              placeholder="Search notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredNotes.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              {searchTerm ? "No notes found" : "No notes yet"}
            </div>
          ) : (
            <div className="space-y-2 p-2">
              {filteredNotes.map((note) => (
                <Card
                  key={note.id}
                  onClick={() => handleSelectNote(note)}
                  className={`cursor-pointer transition-colors hover:bg-accent ${
                    selectedNote?.id === note.id
                      ? "bg-accent border-primary"
                      : ""
                  }`}
                >
                  <CardHeader className="p-4">
                    <CardTitle className="text-base truncate">
                      {note.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-2 text-sm">
                      {note.content}
                    </CardDescription>
                    <CardDescription className="text-xs pt-2">
                      {formatDate(note.updatedAt)}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {isCreating || selectedNote ? (
          <>
            <div className="p-4 border-b bg-card flex items-center justify-between">
              <Input
                type="text"
                placeholder="Note title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="flex-1 text-2xl font-bold border-none shadow-none focus-visible:ring-0 px-0"
              />
              <div className="flex gap-2 ml-4">
                <Button
                  onClick={isCreating ? handleCreateNote : handleUpdateNote}
                  disabled={!title.trim() || !content.trim()}
                  size="sm"
                  variant="default"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
                {!isCreating && selectedNote && (
                  <Button
                    onClick={() => confirmDelete(selectedNote.id!)}
                    size="sm"
                    variant="destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                )}
                <Button onClick={handleCancel} size="sm" variant="destructive">
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
            <div className="flex-1 p-4 bg-background">
              <Textarea
                placeholder="Start writing your note..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full h-full resize-none border-none shadow-none focus-visible:ring-0 text-base"
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <Card className="max-w-md mx-auto bg-transparent border-none shadow-none">
              <CardContent className="text-center pt-6">
                <Edit2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-xl text-muted-foreground">
                  Select a note to edit or create a new one
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              note.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setNoteToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteNote}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default NotesApp;
