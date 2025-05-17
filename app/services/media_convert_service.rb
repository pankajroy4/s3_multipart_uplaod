require 'aws-sdk-mediaconvert'

class MediaConvertService
  def self.call(key)
    self.new(key).submit_job
  end

  def initialize(input_s3_key)
    @input_key = input_s3_key
    @output_bucket = ENV['AWS_BUCKET_NAME']
    @template_name = 'rails_default_transcode'
  end

  def submit_job
    client = Aws::MediaConvert::Client.new(
      endpoint: discover_endpoint,
      region: ENV['AWS_REGION'],
      credentials: Aws::Credentials.new(
        ENV['AWS_ACCESS_KEY_ID'],
        ENV['AWS_SECRET_ACCESS_KEY']
      )
    )

    client.create_job({
      role: ENV['MEDIACONVERT_ROLE_ARN'], # IAM Role ARN with MediaConvert permissions
      settings: {
        inputs: [
          {
            file_input: "s3://#{@output_bucket}/#{@input_key}"
          }
        ],
        output_groups: [] # Will be taken from template
      },
      job_template: @template_name,
    })
  end

  private

  def discover_endpoint
    endpoint_client = Aws::MediaConvert::Client.new(region: ENV['AWS_REGION'])
    endpoint_response = endpoint_client.describe_endpoints
    endpoint_response.endpoints.first.url
  end
end
