/*global jQuery, Handlebars */
jQuery(function ($) {
	'use strict';

	Handlebars.registerHelper('eq', function(a, b, options) {
		return a === b ? options.fn(this) : options.inverse(this);
	});

	var ENTER_KEY = 13;
	var ESCAPE_KEY = 27;

	var util = {
		uuid: function () {
			/*jshint bitwise:false */
			var i, random;
			var uuid = '';

			for (i = 0; i < 32; i++) {
				random = Math.random() * 16 | 0;
				if (i === 8 || i === 12 || i === 16 || i === 20) {
					uuid += '-';
				}
				uuid += (i === 12 ? 4 : (i === 16 ? (random & 3 | 8) : random)).toString(16);
			}

			return uuid;
		},
		pluralize: function (count, word) {
			return count === 1 ? word : word + 's';
		}
		/*,
		store: function (namespace, data) {
			if (arguments.length > 1) {
				var j = JSON.stringify(data);
				console.log("Storing values:\n" + j);
				return localStorage.setItem(namespace, j);
			} else {
				var store = localStorage.getItem(namespace);
				console.log("Getting values from local store");
				var vals = (store && JSON.parse(store)) || [];
				console.log("Got values:\n" + vals)
				return vals;
			}
		}*/
	};

	var App = {
		init: function () {
			this.todos = this.getAllTodos();
			this.cacheElements();
			this.bindEvents();

			Router({
				'/:filter': function (filter) {
					this.filter = filter;
					this.render();
				}.bind(this)
			}).init('/all');
		},
		cacheElements: function () {
			this.todoTemplate = Handlebars.compile($('#todo-template').html());
			this.footerTemplate = Handlebars.compile($('#footer-template').html());
			this.$todoApp = $('#todoapp');
			this.$header = this.$todoApp.find('#header');
			this.$main = this.$todoApp.find('#main');
			this.$footer = this.$todoApp.find('#footer');
			this.$newTodo = this.$header.find('#new-todo');
			this.$toggleAll = this.$main.find('#toggle-all');
			this.$todoList = this.$main.find('#todo-list');
			this.$count = this.$footer.find('#todo-count');
			this.$clearBtn = this.$footer.find('#clear-completed');
		},
		bindEvents: function () {
			var list = this.$todoList;
			this.$newTodo.on('keyup', this.create.bind(this));
			this.$toggleAll.on('change', this.toggleAll.bind(this));
			this.$footer.on('click', '#clear-completed', this.destroyCompleted.bind(this));
			list.on('change', '.toggle', this.toggle.bind(this));
			list.on('dblclick', 'label', this.edit.bind(this));
			list.on('keyup', '.edit', this.editKeyup.bind(this));
			list.on('focusout', '.edit', this.update.bind(this));
			list.on('click', '.destroy', this.destroy.bind(this));
		},
		render: function () {
			console.log("Rendering")
			var todos = this.getFilteredTodos();
			this.$todoList.html(this.todoTemplate(todos));
			this.$main.toggle(todos.length > 0);
			this.$toggleAll.prop('checked', this.getActiveTodos().length === 0);
			this.renderFooter();
			this.$newTodo.focus();
			/*util.store('todos-jquery', this.todos);*/
		},
		renderFooter: function () {
			var todoCount = this.todos.length;
			var activeTodoCount = this.getActiveTodos().length;
			var template = this.footerTemplate({
				activeTodoCount: activeTodoCount,
				activeTodoWord: util.pluralize(activeTodoCount, 'item'),
				completedTodos: todoCount - activeTodoCount,
				filter: this.filter
			});

			this.$footer.toggle(todoCount > 0).html(template);
		},
		toggleAll: function (e) {
			var isChecked = $(e.target).prop('checked');

			this.todos.forEach(function (todo) {
				todo.completed = isChecked;
			});

			this.render();
		},
		getAllTodos: function () {
			console.log("Getting all todos")

			var todos = [];

			var response = $.ajax({
				type: "GET",
				url: "http://localhost:5000/todos",
				async:false,
				dataType: 'json'
			}).done(function(response) {
				todos = response.todos;
			});

			console.log("Got all todos:\n", response);
			return todos;
		},
		getActiveTodos: function () {
			console.log("Getting active todos")

			var todos = [];

			var response = $.ajax({
				type: "GET",
				url: "http://localhost:5000/todos/active",
				async:false,
				dataType: 'json'
			}).done(function(response) {
				todos = response.todos;
			});

			console.log("Got all todos:\n", response);
			return todos;
		},
		getCompletedTodos: function () {
			console.log("Getting completed todos")

			var todos = [];

			var response = $.ajax({
				type: "GET",
				url: "http://localhost:5000/todos/completed",
				async:false,
				dataType: 'json'
			}).done(function(response) {
				todos = response.todos;
			});

			console.log("Got all todos:\n", response);
			return todos;
		},
		getFilteredTodos: function () {
			if (this.filter === 'active') {
				return this.getActiveTodos();
			}

			if (this.filter === 'completed') {
				return this.getCompletedTodos();
			}

			return this.getAllTodos();
		},
		destroyCompleted: function () {
			this.todos = this.getActiveTodos();
			this.filter = 'all';
			this.render();
		},
		// accepts an element from inside the `.item` div and
		// returns the corresponding index in the `todos` array
		indexFromEl: function (el) {
			var id = $(el).closest('li').data('id');
			var todos = this.todos;
			var i = todos.length;

			while (i--) {
				if (todos[i].id === id) {
					return i;
				}
			}
		},
		idFromEl: function(el) {
			var id = $(el).closest('li').data('id');
			return id;
		},
		create: function (e) {
			var $input = $(e.target);
			var val = $input.val().trim();

			if (e.which !== ENTER_KEY || !val) {
				return;
			}

			var todo = {
				"title": val,
				"completed": false
			};

			console.log("Posting:\n" + todo)
			$.ajax({
				type: "POST",
				dataType: "json",
				url: "http://localhost:5000/todo",
				contentType: "application/json; charset=utf-8",	
				data: JSON.stringify(todo),
				async: false
			});


			$input.val('');

			this.render();
		},
		toggle: function (e) {
			var id = this.idFromEl(e.target);

			$.ajax({
				type: "PUT",
				dataType: "json",
				url: "http://localhost:5000/todo/" + id + "/toggle",
				async: false
			});

			this.render();
		},
		edit: function (e) {
			var $input = $(e.target).closest('li').addClass('editing').find('.edit');
			$input.val($input.val()).focus();
		},
		editKeyup: function (e) {
			if (e.which === ENTER_KEY) {
				e.target.blur();
			}

			if (e.which === ESCAPE_KEY) {
				$(e.target).data('abort', true).blur();
			}
		},
		update: function (e) {
			var el = e.target;
			var $el = $(el);
			var val = $el.val().trim();
			var id = this.idFromEl(el);

			if ($el.data('abort')) {
				$el.data('abort', false);
				this.render();
				return;
			}

			var i = this.indexFromEl(el);

			if (val) {
				var j = JSON.stringify({"title": val})

				$.ajax({
					type: "PUT",
					dataType: "json",
					url: "http://localhost:5000/todo/" + id + "/title",
					data: j,
					async: false
				});
			} 

			this.render();
		},
		destroy: function (e) {
			var id = this.idFromEl(e.target);
			console.log("Destroy:\n" + id);
			$.ajax({
				type: "DELETE",
				url: "http://localhost:5000/todo/" + id,
				async: false
			})
			this.render();
		}
	};

	App.init();
});
