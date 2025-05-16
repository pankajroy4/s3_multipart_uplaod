# class TranscodeController < ApplicationController
#   def create
#     key = params[:key]
#     MediaConvertService.new(key).submit_job
#     render json: { message: "Transcoding job submitted successfully." }
#   end
# end
# app/controllers/transcode_controller.rb
class TranscodeController < ApplicationController
  protect_from_forgery with: :null_session

  def create

    key = params[:key] || params.dig(:transcode, :key)
    job = MediaConvertService.new(key).submit_job


    render json: { success: true, message: "Transcoding job started", job_id: job[:job][:id] }, status: :ok
  rescue => e
    render json: { success: false, error: e.message }, status: :internal_server_error
  end
end
