class TranscodeController < ApplicationController
  protect_from_forgery with: :null_session

  def create
    key = params[:key] || params.dig(:transcode, :key)
    job = MediaConvertService.call(key)

    render json: { success: true, message: "Transcoding job started", job_id: job[:job][:id] }, status: :ok
  rescue => e
    render json: { success: false, error: e.message }, status: :internal_server_error
  end
end
