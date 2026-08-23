# Conductor

An Obsidian plugin for managing personal projects, tasks, and journalling inside a PKM vault. This context covers the language used across its commands, pickers, and views.

## Language

**Category**:
A classification of what kind of thing a note is, expressed as a wikilinked frontmatter value such as `[[Project]]`, `[[Task]]`, or `[[Journal]]`.
_Avoid_: Type, label

**Project**:
A note representing an ongoing body of work that groups related tasks.
_Avoid_: Epic, repo

**Task**:
A note representing a single unit of work that belongs to a project.
_Avoid_: Todo, issue

**Journal entry**:
A short timestamped note recording something from the day, named `YYYY-MM-DD HHMM - Title`.
_Avoid_: Daily note, diary

**Journal title**:
The human-readable name of a journal entry once its date and time prefix is stripped.
_Avoid_: Filename, basename

**Daily note**:
A note representing a whole calendar day, named by date alone. Distinct from a journal entry, which records a moment within a day.
_Avoid_: Journal entry

**Topic**:
A note representing a subject that other notes link to through their topics list.
_Avoid_: Tag, category

**Display text**:
The wording shown in an inserted link, which may differ from the target note's name.
_Avoid_: Alias, label
