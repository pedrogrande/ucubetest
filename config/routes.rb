Rails.application.routes.draw do
  root 'public#home'
  get 'home2', to: 'public#home2'
  get 'test1', to: 'public#test1'
  get 'test2', to: 'public#test2'
  get 'test3', to: 'public#test3'
  get 'test4', to: 'public#test4'
  get 'learn', to: "public#learn"
  get 'join', to: "public#join"
  get 'partner', to: "public#partner"
  get 'explore', to: "public#explore"
  devise_for :users
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Defines the root path route ("/")
  # root "articles#index"
end
