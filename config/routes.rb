Rails.application.routes.draw do
  root "uploads#index"

  post "uploads/initiate", to: "uploads#initiate"
  post "uploads/presign", to: "uploads#presign"
  post "uploads/complete", to: "uploads#complete"
  get "/uploads/list", to: "uploads#list"
  post "/uploads/abort", to: "uploads#abort"

  delete "/uploads/destroy", to: "uploads#destroy"
  post "transcode", to: "transcode#create"
end
