# class UploadsController < ApplicationController
#   def index
#   end

#   def initiate
#     s3 = Aws::S3::Client.new
#     key = "uploads/#{SecureRandom.uuid}/#{params[:filename]}"

#     resp = s3.create_multipart_upload(bucket: ENV["AWS_BUCKET_NAME"], key: key)
#     render json: { upload_id: resp.upload_id, key: key }
#   end

#   def presign
#     s3 = Aws::S3::Resource.new
#     object = s3.bucket(ENV["AWS_BUCKET_NAME"]).object(params[:key])

#     urls = (1..params[:parts].to_i).map do |part_number|
#       url = object.presigned_url(
#         :upload_part,
#         upload_id: params[:upload_id],
#         part_number: part_number,
#         expires_in: 3600,
#       )

#       { part_number: part_number, url: url }
#     end

#     render json: urls
#   end

#   def complete
#     s3 = Aws::S3::Client.new

#     parts = params[:parts].map do |p|
#       { part_number: p[:part_number], etag: p[:etag] }
#     end

#     resp = s3.complete_multipart_upload(
#       bucket: ENV["AWS_BUCKET_NAME"],
#       key: params[:key],
#       upload_id: params[:upload_id],
#       multipart_upload: { parts: parts },
#     )

#     render json: { location: resp.location }
#   end

#   def abort
#     s3 = Aws::S3::Client.new
#     key = params[:key]
#     upload_id = params[:upload_id]

#     s3.abort_multipart_upload(
#       bucket: ENV["AWS_BUCKET_NAME"],
#       key: key,
#       upload_id: upload_id,
#     )

#     head :no_content
#   end

#   def list
#     s3 = Aws::S3::Client.new
#     bucket = ENV["AWS_BUCKET_NAME"]
#     objects = s3.list_objects_v2(bucket: bucket).contents
#     signer = Aws::S3::Presigner.new

#     files = objects.map do |obj|
#       {
#         filename: File.basename(obj.key),
#         key: obj.key,
#         size: obj.size,
#         created_at: obj.last_modified,
#         url: signer.presigned_url(:get_object, bucket: bucket, key: obj.key, expires_in: 3600),
#         type: mime_type_from_key(obj.key),
#       }
#     end

#     render json: files
#   end

#   def destroy
#     key = params[:key]
#     s3 = Aws::S3::Client.new
#     s3.delete_object(bucket: ENV["AWS_BUCKET_NAME"], key: key)

#     head :no_content
#   end

#   private

#   def mime_type_from_key(key)
#     extension = File.extname(key).delete(".").downcase
#     mime_types = {
#       "jpg" => "image/jpeg",
#       "jpeg" => "image/jpeg",
#       "png" => "image/png",
#       "gif" => "image/gif",
#       "mp4" => "video/mp4",
#       "mov" => "video/quicktime",
#       "pdf" => "application/pdf",
#       "doc" => "application/msword",
#       "docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
#     }

#     mime_types[extension] || "application/octet-stream"
#   end
# end


# app/controllers/uploads_controller.rb
class UploadsController < ApplicationController
  protect_from_forgery with: :null_session # for API-like behavior

  def initiate
    file = params.require(:filename)
    filesize = params[:filesize]

    session = UploadSession.find_by(filename: file, filesize: filesize, status: :in_progress)

    if session
      render json: {
        upload_id: session.upload_id,
        key: session.key,
        uploaded_parts: session.uploaded_part_numbers
      }
    else
      key = "uploads/#{SecureRandom.uuid}/#{file}"
      response = s3_client.create_multipart_upload(bucket: ENV["AWS_BUCKET_NAME"], key: key)

      session = UploadSession.create!(
        filename: file,
        filesize: filesize,
        key: key,
        upload_id: response.upload_id
      )

      render json: { upload_id: session.upload_id, key: key, uploaded_parts: [] }
    end
  end


  def presign
    session = UploadSession.find_by!(key: params[:key], upload_id: params[:upload_id])
    missing_parts = (1..params[:parts].to_i).to_a - session.uploaded_part_numbers

    s3 = Aws::S3::Resource.new
    object = s3.bucket(ENV["AWS_BUCKET_NAME"]).object(session&.key)

    urls = missing_parts.map do |part_number|
      url = object.presigned_url(:upload_part,
        upload_id: session.upload_id,
        part_number: part_number,
        expires_in: 3600
      )
      { part_number:, url: }
    end

    render json: urls
  end


    def list
    s3 = Aws::S3::Client.new
    bucket = ENV["AWS_BUCKET_NAME"]
    objects = s3.list_objects_v2(bucket: bucket).contents
    signer = Aws::S3::Presigner.new

    files = objects.map do |obj|
      {
        filename: File.basename(obj.key),
        key: obj.key,
        size: obj.size,
        created_at: obj.last_modified,
        url: signer.presigned_url(:get_object, bucket: bucket, key: obj.key, expires_in: 3600),
        type: mime_type_from_key(obj.key),
      }
    end

    render json: files
  end



  def complete
    session = UploadSession.find_by!(key: params[:key], upload_id: params[:upload_id])
    parts = params[:parts]

    s3_client.complete_multipart_upload(
      bucket: ENV["AWS_BUCKET_NAME"],
      key: session.key,
      upload_id: session.upload_id,
      multipart_upload: {
        parts: parts.map do |part|
          session.upload_parts.create!(part_number: part[:part_number], etag: part[:etag])
          {
            part_number: part[:part_number],
            etag: part[:etag]
          }
        end
      }
    )

    session.update!(status: :completed)
    render json: { success: true }
  end

  def abort
    session = UploadSession.find_by!(key: params[:key], upload_id: params[:upload_id])

    s3_client.abort_multipart_upload(
      bucket: ENV["AWS_BUCKET_NAME"],
      key: session.key,
      upload_id: session.upload_id
    )

    session.update!(status: :aborted)
    render json: { success: true }
  end

    def destroy
    key = params[:key]
    s3 = Aws::S3::Client.new
    s3.delete_object(bucket: ENV["AWS_BUCKET_NAME"], key: key)

    head :no_content
  end

  private

  def s3_client
    Aws::S3::Client.new
  end


  def mime_type_from_key(key)
    extension = File.extname(key).delete(".").downcase
    mime_types = {
      "jpg" => "image/jpeg",
      "jpeg" => "image/jpeg",
      "png" => "image/png",
      "gif" => "image/gif",
      "mp4" => "video/mp4",
      "mov" => "video/quicktime",
      "pdf" => "application/pdf",
      "doc" => "application/msword",
      "docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }

    mime_types[extension] || "application/octet-stream"
  end
end
