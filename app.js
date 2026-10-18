/* ============================================================
   2Dolist — Application Logic
   ============================================================ */

class TodoApp {
  constructor() {
    this.STORAGE_KEY = '2dolist_tasks';
    this.tasks = this.loadTasks();
    this.filter = 'all'; // 'all' | 'active' | 'completed'

    // DOM refs
    this.form       = document.getElementById('addForm');
    this.input      = document.getElementById('taskInput');
    this.list       = document.getElementById('taskList');
    this.emptyState = document.getElementById('emptyState');
    this.filtersNav = document.getElementById('filters');
    this.activeCount    = document.getElementById('activeCount');
    this.clearBtn       = document.getElementById('clearCompleted');
    this.footer         = document.getElementById('footer');
    this.taskSummary    = document.getElementById('taskSummary');

    this.bindEvents();
    this.render();
  }

  /* ---------- Events ---------- */
  bindEvents() {
    // Add task
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.addTask();
    });

    // Filter tabs
    this.filtersNav.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-filter]');
      if (!btn) return;
      this.setFilter(btn.dataset.filter);
    });

    // Task list delegation
    this.list.addEventListener('change', (e) => {
      if (e.target.matches('.task-check')) {
        this.toggleTask(e.target.dataset.id);
      }
    });

    this.list.addEventListener('click', (e) => {
      const delBtn = e.target.closest('.task-item__delete');
      if (delBtn) {
        this.deleteTask(delBtn.dataset.id);
      }
    });

    // Double-click to edit
    this.list.addEventListener('dblclick', (e) => {
      const label = e.target.closest('.task-item__label');
      if (label) {
        this.startEdit(label.dataset.id);
      }
    });

    // Clear completed
    this.clearBtn.addEventListener('click', () => this.clearCompleted());
  }

  /* ---------- CRUD ---------- */
  addTask() {
    const text = this.input.value.trim();
    if (!text) return;

    const task = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      text,
      completed: false,
      createdAt: Date.now(),
    };

    this.tasks.unshift(task);
    this.save();
    this.render();
    this.input.value = '';
    this.input.focus();
  }

  toggleTask(id) {
    const task = this.tasks.find((t) => t.id === id);
    if (task) {
      task.completed = !task.completed;
      this.save();
      this.render();
    }
  }

  deleteTask(id) {
    const el = this.list.querySelector(`[data-task-id="${id}"]`);
    if (el) {
      el.classList.add('removing');
      el.addEventListener('animationend', () => {
        this.tasks = this.tasks.filter((t) => t.id !== id);
        this.save();
        this.render();
      }, { once: true });
    }
  }

  startEdit(id) {
    const task = this.tasks.find((t) => t.id === id);
    if (!task || task.completed) return;

    const li = this.list.querySelector(`[data-task-id="${id}"]`);
    const label = li.querySelector('.task-item__label');

    // Replace label with input
    const editInput = document.createElement('input');
    editInput.type = 'text';
    editInput.className = 'task-item__edit';
    editInput.value = task.text;
    editInput.maxLength = 120;

    label.replaceWith(editInput);
    editInput.focus();
    editInput.select();

    const commitEdit = () => {
      const newText = editInput.value.trim();
      if (newText && newText !== task.text) {
        task.text = newText;
        this.save();
      }
      this.render();
    };

    editInput.addEventListener('blur', commitEdit, { once: true });
    editInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); editInput.blur(); }
      if (e.key === 'Escape') { editInput.value = task.text; editInput.blur(); }
    });
  }

  clearCompleted() {
    // Animate out completed items
    const completedEls = this.list.querySelectorAll('.task-item--done');
    if (completedEls.length === 0) return;

    let pending = completedEls.length;
    completedEls.forEach((el) => {
      el.classList.add('removing');
      el.addEventListener('animationend', () => {
        pending--;
        if (pending === 0) {
          this.tasks = this.tasks.filter((t) => !t.completed);
          this.save();
          this.render();
        }
      }, { once: true });
    });
  }

  /* ---------- Filtering ---------- */
  setFilter(filter) {
    this.filter = filter;
    this.filtersNav.querySelectorAll('.filters__btn').forEach((btn) => {
      btn.classList.toggle('filters__btn--active', btn.dataset.filter === filter);
    });
    this.render();
  }

  getFilteredTasks() {
    switch (this.filter) {
      case 'active':    return this.tasks.filter((t) => !t.completed);
      case 'completed': return this.tasks.filter((t) => t.completed);
      default:          return this.tasks;
    }
  }

  /* ---------- Rendering ---------- */
  render() {
    const filtered = this.getFilteredTasks();
    const activeLeft = this.tasks.filter((t) => !t.completed).length;
    const completedCount = this.tasks.filter((t) => t.completed).length;

    // Task list
    this.list.innerHTML = filtered
      .map((task) => this.renderTask(task))
      .join('');

    // Empty state
    this.emptyState.classList.toggle('empty-state--visible', filtered.length === 0);

    // Footer
    this.footer.classList.toggle('card__footer--hidden', this.tasks.length === 0);
    this.activeCount.textContent = `${activeLeft} task${activeLeft !== 1 ? 's' : ''} left`;
    this.clearBtn.style.visibility = completedCount > 0 ? 'visible' : 'hidden';

    // Subtitle
    if (this.tasks.length === 0) {
      this.taskSummary.textContent = 'What needs to be done?';
    } else if (activeLeft === 0) {
      this.taskSummary.textContent = 'All done — great job! 🎉';
    } else {
      this.taskSummary.textContent = `${activeLeft} task${activeLeft !== 1 ? 's' : ''} remaining`;
    }
  }

  renderTask(task) {
    const doneClass = task.completed ? 'task-item--done' : '';
    return `
      <li class="task-item ${doneClass}" data-task-id="${task.id}">
        <label class="task-item__check">
          <input
            type="checkbox"
            class="task-check"
            data-id="${task.id}"
            ${task.completed ? 'checked' : ''}
            aria-label="Toggle ${this.escapeHtml(task.text)}"
          />
        </label>
        <span class="task-item__label" data-id="${task.id}">${this.escapeHtml(task.text)}</span>
        <button class="task-item__delete" data-id="${task.id}" aria-label="Delete task">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
        </button>
      </li>`;
  }

  /* ---------- Persistence ---------- */
  loadTasks() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  save() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.tasks));
  }

  /* ---------- Utility ---------- */
  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

/* ---------- Bootstrap ---------- */
document.addEventListener('DOMContentLoaded', () => {
  new TodoApp();
});
