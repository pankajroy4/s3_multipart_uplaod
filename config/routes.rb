Rails.application.routes.draw do
  root "uploads#index"

  resources :uploads, only: [] do
    collection do
      post :initiate
      post :presign
      post :complete
      post :abort
      get :list
    end
  end
  delete "/uploads/destroy", to: "uploads#destroy"
  post "transcode", to: "transcode#create"
end
