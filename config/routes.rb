Rails.application.routes.draw do
  root 'public#home'
  get 'home2', to: 'public#home2'
  get 'about-ucubed', to: 'public#about_ucubed'
  get 'articles', to: 'public#articles'
  get 'free_resources', to: 'public#free_resources'
  # get 'test4', to: 'public#test4'
  get 'learn', to: "public#learn"
  get 'join', to: "public#join"
  get 'partner', to: "public#partner"
  get 'explore', to: "public#explore"
  devise_for :users
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Defines the root path route ("/")
  # root "articles#index"
end
